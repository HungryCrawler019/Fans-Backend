import { User } from "@prisma/client";
import PrismaService from "../common/service/PrismaService.js";
import RPCManagerService from "../common/service/RPCManagerService.js";
import SessionManagerService from "../common/service/SessionManagerService.js";
import {
	MessageEventType,
	Opcode,
	PayloadData,
	PayloadStartSession,
} from "./ProtocolSchema.js";
import WebSocketSession from "./WebSocketSession.js";
import { Json } from "../common/Types.js";
import { Logger } from "pino";
import { ChatRPCType } from "../common/rpc/ChatRPC.js";
import { CloseReason } from "./Constants.js";
import * as Sentry from "@sentry/node";
import InboxManagerService from "../common/service/InboxManagerService.js";
import { IMessage, IUser } from "../web/CommonAPISchemas.js";
import { UserRPCType } from "../common/rpc/UserRPC.js";

const enum SessionState {
	Unauthenticated = 0,
	Authenticating = 1,
	Authenticated = 2,
	Dead = 3,
}

class SessionHandler {
	#session: WebSocketSession;
	#prisma: PrismaService;
	#rpc: RPCManagerService;
	#sessionManager: SessionManagerService;
	#inboxManager: InboxManagerService;
	#logger: Logger;

	#state: SessionState;
	#user: User | null = null;
	#inboxIds: Set<bigint> = new Set();

	constructor(
		session: WebSocketSession,
		prisma: PrismaService,
		rpc: RPCManagerService,
		sessionManager: SessionManagerService,
		inboxManager: InboxManagerService,
		logger: Logger,
	) {
		this.#session = session;
		this.#prisma = prisma;
		this.#rpc = rpc;
		this.#sessionManager = sessionManager;
		this.#inboxManager = inboxManager;
		this.#logger = logger;

		this.#state = SessionState.Unauthenticated;
	}

	async onStartSession(data: PayloadData<PayloadStartSession>) {
		if (this.#state !== SessionState.Unauthenticated) {
			this.#session.end(CloseReason.DisallowedOperation);
			return;
		}

		if (data.apiVersion !== 1) {
			this.#session.end(CloseReason.UnsupportedAPIVersion);
			return;
		}

		const transaction = Sentry.startTransaction({ name: "onStartSession" });
		transaction.setData("sessionId", this.#session.sessionId);
		transaction.setData("apiVersion", data.apiVersion);
		transaction.setData("appVersion", data.appVersion);

		this.#state = SessionState.Authenticating;

		const { token } = data;

		const getSessionChild = transaction.startChild({
			name: "getSessionFromToken",
			op: "db",
		});
		const session = await this.#sessionManager
			.getSessionFromToken(token)
			.catch(() => void 0);
		getSessionChild.finish();

		if (!session) return this.#session.end(CloseReason.AuthenticationError);

		const userChild = transaction.startChild({
			name: "getUser",
			op: "db",
		});
		const user = await session.getUser(this.#prisma);
		this.#user = user;
		userChild.finish();
		transaction.setData("userId", user.id.toString());

		const inboxChild = transaction.startChild({
			name: "getInbox",
			op: "db",
		});
		const inboxes = await this.#prisma.messageChannelInbox.findMany({
			where: { userId: user.id },
			include: {
				channel: true,
			},
		});
		const conversations = await Promise.all(
			inboxes.map((inbox) =>
				this.#inboxManager.getConversationMeta(inbox),
			),
		);
		inboxChild.finish();

		this.#inboxIds = new Set(inboxes.map((inbox) => inbox.channelId));

		this.#rpc.subscribe(`chat:${user.id}`, this.#onChatRPCMessage);
		this.#rpc.subscribe(`user:${user.id}`, this.#onUserRPCMessage);

		this.#session.sendPayload(Opcode.ReadySession, {
			userId: user.id,
			displayName: user.displayName,
			conversations,
		});

		this.#state = SessionState.Authenticated;
		transaction.finish();
	}

	cleanup() {
		if (this.#state === SessionState.Dead) return;

		this.#state = SessionState.Dead;
		if (this.#user) {
			this.#rpc.unsubscribe(
				`chat:${this.#user.id}`,
				this.#onChatRPCMessage,
			);
			this.#rpc.unsubscribe(
				`user:${this.#user.id}`,
				this.#onUserRPCMessage,
			);
		}
	}

	#onChatRPCMessage = async (data: Json) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) return;

		this.#logger.debug("Chat RPC message received %s", data);
		const type = data.type as ChatRPCType;
		switch (type) {
			case ChatRPCType.MessageCreated: {
				const message: IMessage = data.message as unknown as IMessage;

				await this.#ensureInbox(BigInt(message.channelId));

				this.#session.sendPayload(Opcode.MessageEvent, {
					type: MessageEventType.Created,
					message,
				});
				break;
			}
		}
	};

	#onUserRPCMessage = async (data: Json) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) return;

		this.#logger.debug("User RPC message received %s", data);
		const type = data.type as UserRPCType;
		switch (type) {
			case UserRPCType.SyncUserInfo: {
				this.#session.sendPayload(
					Opcode.UserSync,
					data.data as Partial<IUser>,
				);
				break;
			}
		}
	};

	async #ensureInbox(channelId: bigint) {
		if (this.#inboxIds.has(channelId)) return;

		const inbox = await this.#prisma.messageChannelInbox.findFirst({
			where: {
				userId: this.#user!.id,
				channelId,
			},
			include: {
				channel: true,
			},
		});

		if (!inbox) {
			return;
		}

		this.#inboxIds.add(channelId);
		const meta = await this.#inboxManager.getConversationMeta(inbox);

		this.#session.sendPayload(Opcode.InboxSync, meta);
	}
}

export default SessionHandler;
