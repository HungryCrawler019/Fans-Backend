import { IMessage } from "../../web/CommonAPISchemas.js";
import { PrismaJson } from "../Types.js";
import RPCManagerService from "../service/RPCManagerService.js";

export enum ChatRPCType {
	MessageCreated = "MESSAGE_CREATED",
}

export function messageCreated(
	rpc: RPCManagerService,
	userId: bigint,
	message: IMessage,
) {
	const payload = {
		type: ChatRPCType.MessageCreated,
		message: message as PrismaJson<IMessage>,
	};

	rpc.publish(`chat:${userId}`, payload);
}
