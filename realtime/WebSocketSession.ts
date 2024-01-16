import { Container } from "async-injection";
import { decode, encode } from "cborg";
import { randomBytes } from "node:crypto";
import { Logger } from "pino";
import { WebSocket } from "uWebSockets.js";
import PrismaService from "../common/service/PrismaService.js";
import RPCManagerService from "../common/service/RPCManagerService.js";
import SessionManagerService from "../common/service/SessionManagerService.js";
import { Opcode, WebSocketPayload } from "./ProtocolSchema.js";
import SessionHandler from "./SessionHandler.js";
import { Static, TSchema } from "@sinclair/typebox";
import { TypeCheck } from "@sinclair/typebox/compiler";
import {
	PayloadPingDataValidator,
	PayloadPongDataValidator,
	PayloadStartSessionDataValidator,
} from "./ProtocolSchemaValidator.js";
import { CloseReason } from "./Constants.js";
import InboxManagerService from "../common/service/InboxManagerService.js";

export type WebSocketWithSession = WebSocket<unknown> & {
	session?: WebSocketSession;
};

const PING_INTERVAL = 30 * 1000;

export default class WebSocketSession {
	public readonly sessionId: string;

	readonly #sessionManager: SessionManagerService;
	readonly #inboxManager: InboxManagerService;
	readonly #prisma: PrismaService;
	readonly #rpc: RPCManagerService;
	readonly #logger: Logger;
	readonly #ws: WebSocket<unknown>;
	readonly #handler: SessionHandler;

	#lastPingReceived = 0;
	#lastPingSent = 0;

	#pingInterval: NodeJS.Timeout | null = null;
	#cleanedUp = false;

	public constructor(
		sessionManager: SessionManagerService,
		inboxManager: InboxManagerService,
		prisma: PrismaService,
		rpc: RPCManagerService,
		logger: Logger,
		ws: WebSocket<unknown>,
	) {
		this.#sessionManager = sessionManager;
		this.#inboxManager = inboxManager;
		this.#prisma = prisma;
		this.#rpc = rpc;
		this.#logger = logger;
		this.#ws = ws;
		this.#handler = new SessionHandler(
			this,
			prisma,
			rpc,
			sessionManager,
			inboxManager,
			logger,
		);

		this.sessionId = randomBytes(16).toString("base64url");

		const wss = ws as WebSocketWithSession;
		wss.session = this;

		this.#pingInterval = setInterval(() => this.#ping(), PING_INTERVAL);

		this.sendPayload(Opcode.Hello, {
			sessionId: this.sessionId,
			pingInterval: PING_INTERVAL,
		});
	}

	public async onMessage(buf: ArrayBuffer) {
		const logger = this.#logger;

		try {
			const payload = decode(new Uint8Array(buf)) as WebSocketPayload;
			const [op, data] = payload;

			switch (op) {
				case Opcode.Pong: {
					if (!this.#validatePayload(PayloadPongDataValidator, data))
						return;

					if (data !== this.#lastPingSent) {
						return this.end(CloseReason.PingTimeout);
					}

					this.#lastPingReceived = data;

					break;
				}
				case Opcode.Ping: {
					if (!this.#validatePayload(PayloadPingDataValidator, data))
						return;

					this.sendPayload(Opcode.Pong, data);

					break;
				}
				case Opcode.StartSession: {
					if (
						!this.#validatePayload(
							PayloadStartSessionDataValidator,
							data,
						)
					)
						return;

					this.#handler.onStartSession(data);

					break;
				}
				default:
					return this.end(CloseReason.InvalidPayload);
			}
		} catch (e) {
			logger.error(
				e,
				"Error occurred while processing WebSocket message",
			);
			this.end(CloseReason.ServerError);
		}
	}

	public onClose(code: number, message: ArrayBuffer) {
		this.#cleanup();
	}

	#ping() {
		if (this.#lastPingReceived !== this.#lastPingSent) {
			return this.end(CloseReason.PingTimeout);
		}

		this.#lastPingSent = Date.now();
		this.sendPayload(Opcode.Ping, this.#lastPingSent);
	}

	end(code: (typeof CloseReason)[keyof typeof CloseReason]) {
		this.sendPayload(Opcode.DeadSession, {});
		this.#ws.end(code.code, code.message);
		this.#cleanup();
	}

	sendPayload<P extends WebSocketPayload>(op: P[0], payload: P[1]) {
		const buf = encode([op, payload]);
		this.#ws.send(buf, true);
	}

	#validatePayload<T extends TSchema>(
		schema: TypeCheck<T>,
		payload: unknown,
	): payload is Static<T> {
		if (!schema.Check(payload)) {
			this.end(CloseReason.InvalidPayload);
			return false;
		}

		return true;
	}

	#cleanup() {
		if (this.#cleanedUp) return;

		this.#cleanedUp = true;
		this.#pingInterval && clearInterval(this.#pingInterval);
		this.#handler.cleanup();
	}
}

export async function sessionFactory(
	container: Container,
	ws: WebSocket<unknown>,
) {
	const sessionManager = await container.resolve(SessionManagerService);
	const inboxManager = await container.resolve(InboxManagerService);
	const prisma = await container.resolve(PrismaService);
	const rpc = await container.resolve(RPCManagerService);
	const logger = await container.resolve<Logger>("logger");

	return new WebSocketSession(
		sessionManager,
		inboxManager,
		prisma,
		rpc,
		logger,
		ws,
	);
}
