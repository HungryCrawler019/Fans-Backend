import {
	FanReferral,
	OAuth2LinkedAccount,
	Profile,
	StoryViewer,
	User,
} from "@prisma/client";
import { Injectable } from "async-injection";
import { preHandlerAsyncHookHandler } from "fastify";
import crypto from "node:crypto";

import { authAPIErrors } from "../APIErrors/auth.js";
import { genericAPIErrors } from "../APIErrors/generic.js";
import { Signer, TimestampSigner } from "../itsdangerous/index.js";
import PrismaService from "./PrismaService.js";
import RedisService from "./RedisService.js";

interface SessionPayload {
	version: number;
	userId: string;
}

@Injectable()
export class Session {
	#redis: RedisService;
	#signer: Signer;
	sessionId: string;
	userId: string;

	constructor(
		redis: RedisService,
		signer: Signer,
		sessionId: string,
		payload: SessionPayload,
	) {
		this.#redis = redis;
		this.#signer = signer;
		payload = this.#upgradePayload(payload);

		this.sessionId = sessionId;
		this.userId = payload.userId;

		this.save();
	}

	#upgradePayload(payload: SessionPayload): SessionPayload {
		if (payload.version === 1) {
			return payload;
		}

		throw new Error("Invalid payload version");
	}

	save() {
		return this.#redis.set(
			`sessions:${this.sessionId}`,
			JSON.stringify({
				version: 1,
				userId: this.userId,
			}),
			"EX",
			SessionManagerService.MAX_AGE,
		);
	}

	destroy() {
		return this.#redis.del(`sessions:${this.sessionId}`);
	}

	async getAllSessionKeys(): Promise<string[]> {
		const [_cur, sessions] = await this.#redis.scan(
			"0",
			"MATCH",
			`sessions:${this.userId}.*`,
		);

		return sessions;
	}

	async destroyOtherSessions() {
		const sessionKeys = await this.getAllSessionKeys();
		const currentSessionKey = `sessions:${this.sessionId}`;

		await this.#redis.del(
			...sessionKeys.filter((key) => key !== currentSessionKey),
		);
	}

	createToken(): string {
		return this.#signer.sign(this.sessionId);
	}

	async getUser(prisma: PrismaService): Promise<User> {
		const user = await prisma.user.findFirstOrThrow({
			where: { id: BigInt(this.userId) },
		});

		return user;
	}
	async getUserWithProfile(prisma: PrismaService): Promise<
		User & {
			profile?: Profile | null;
			storyViewers?: StoryViewer[] | null;
			linkedAccounts: OAuth2LinkedAccount[] | null;
			fanReferrals: FanReferral[] | null;
		}
	> {
		const user = await prisma.user.findFirstOrThrow({
			where: { id: BigInt(this.userId) },
			include: {
				profile: true,
				storyViewers: true,
				linkedAccounts: true,
				fanReferrals: true,
			},
		});

		return user;
	}

	async getProfile(prisma: PrismaService): Promise<Profile | null> {
		const profile = await prisma.profile.findFirst({
			where: { userId: BigInt(this.userId) },
		});

		return profile;
	}
}

@Injectable()
class SessionManagerService {
	#prisma: PrismaService;
	#redis: RedisService;
	#signer: Signer;
	#fingerprintSigner: TimestampSigner;

	static MAX_AGE = 2592000;

	/**
	 * A request-pre handler that resolves the session token from the request and puts it in the request object.
	 */
	sessionPreHandler: preHandlerAsyncHookHandler;

	/**
	 * A request-pre handler that checks if the user is authenticated and if not, returns a 401.
	 */
	requireAuthHandler: preHandlerAsyncHookHandler;

	requireProfileHandler: preHandlerAsyncHookHandler;

	constructor(prisma: PrismaService, redis: RedisService) {
		if (!process.env.SECRET_KEY) {
			throw new Error("Missing SECRET_KEY");
		}

		this.#prisma = prisma;
		this.#redis = redis;
		this.#signer = new Signer(process.env.SECRET_KEY, {
			digestMethod: "sha3-256",
		});
		this.#fingerprintSigner = new TimestampSigner(
			"we just want somewhat immune to tampering fingerprints ih4wtu0dwc2Z9Yfn",
			{
				digestMethod: "sha3-224",
			},
		);

		this.#createHandlers();
	}

	#createHandlers() {
		this.sessionPreHandler = async (request, reply) => {
			const token = request.headers["authorization"];
			if (!token) {
				return;
			}

			try {
				request.session = await this.getSessionFromToken(token);
			} catch {
				request.session = undefined;
			}
		};

		this.requireAuthHandler = async (request, reply) => {
			if (!request.session) {
				reply.sendError(authAPIErrors.UNAUTHORIZED);
			}
		};

		this.requireProfileHandler = async (request, reply) => {
			if (!request.session) {
				reply.sendError(authAPIErrors.UNAUTHORIZED);
			}
			const profile = await request.session
				?.getProfile(this.#prisma)
				.catch(() => null);

			if (!profile) {
				reply.sendError(
					genericAPIErrors.INVALID_REQUEST(
						"You don't have active profile yet!",
					),
				);
			}
		};
	}

	/**
	 * @param token The authorization token
	 * @returns Session or undefined if session or token is invalid or has expired.
	 */
	async getSessionFromToken(token: string): Promise<Session | undefined> {
		const sessionId = this.#signer.unsign(token);

		if (!sessionId) return undefined;

		const session = await this.#redis.get(`sessions:${sessionId}`);
		if (!session) {
			return undefined;
		}

		return new Session(
			this.#redis,
			this.#signer,
			sessionId,
			JSON.parse(session),
		);
	}

	/**
	 * Creates a session.
	 * @param id The user ID to create session for.
	 */
	async createSessionForUser(id: string): Promise<Session> {
		const sessionKey = crypto.randomBytes(24).toString("base64url");
		const sessionId = `${id.toString()}.${sessionKey}`;

		const payload: SessionPayload = {
			version: 1,
			userId: id,
		};

		const session = new Session(
			this.#redis,
			this.#signer,
			sessionId,
			payload,
		);

		return session;
	}

	/**
	 * Destroys all sessions for a specified user.
	 * @param id The user ID to destroy sessions for.
	 */
	async destroySessionsForUser(id: string) {
		const [_cur, sessionKeys] = await this.#redis.scan(
			"0",
			"MATCH",
			`sessions:${id}.*`,
		);

		await this.#redis.del(...sessionKeys);
	}
}

export default SessionManagerService;
