import { IConversationMeta, IMessage, IUser } from "../web/CommonAPISchemas.js";

export const enum Opcode {
	Ping = 0,
	Pong,
	Hello,
	StartSession,
	DeadSession,
	ReadySession,
	MessageEvent,
	InboxSync,
	UserSync,

	// used while checking whether the opcode is in the range
	Max,
}

/**
 * Every WebSocket message is CBOR encoded and has the structure of an [opcode, payload] array.
 */
export type Payload<O, T> = [O, T];

export type PayloadData<P extends Payload<Opcode, unknown>> = P[1];

/**
 * Sent by the server to client to check whether the connection is still alive.
 * The client should respond with a Pong message, with the same payload.
 */
export type PayloadPing = Payload<Opcode.Ping, number>;

/**
 * Sent by the client as a response to a Ping message.
 * The payload should be the same as the one in the Ping message.
 */
export type PayloadPong = Payload<Opcode.Pong, number>;

/**
 * Sent by the server to client when the server is ready to accept messages.
 * The client should authenticate itself with a StartSession message.
 */
export type PayloadHello = Payload<
	Opcode.Hello,
	{
		sessionId: string;
		pingInterval: number;
	}
>;

/**
 * Sent by the client to authenticate itself with the server.
 */
export type PayloadStartSession = Payload<
	Opcode.StartSession,
	{
		token: string;
		apiVersion: number;
		appVersion?: string;
		platform?: string;
	}
>;

/**
 * Sent by the server to client when the session is dead.
 * The server will close the connection after sending this message.
 */
export type PayloadDeadSession = Payload<Opcode.DeadSession, {}>;

/**
 * Sent by the server to client when the session is ready.
 */
export type PayloadReadySession = Payload<
	Opcode.ReadySession,
	{
		userId: bigint;
		displayName: string;
		conversations: IConversationMeta[];
	}
>;

export const enum MessageEventType {
	Created,
	Updated,
	Deleted,
}

export type PayloadMessageEvent = Payload<
	Opcode.MessageEvent,
	{
		type: MessageEventType;
		message: IMessage;
	}
>;

export type PayloadInboxSync = Payload<Opcode.InboxSync, IConversationMeta>;

export type PayloadUserSync = Payload<Opcode.UserSync, Partial<IUser>>;

export type WebSocketPayload =
	| PayloadPing
	| PayloadPong
	| PayloadHello
	| PayloadStartSession
	| PayloadDeadSession
	| PayloadReadySession
	| PayloadMessageEvent
	| PayloadInboxSync
	| PayloadUserSync;
