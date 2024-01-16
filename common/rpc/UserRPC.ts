import { IMessage, IUser } from "../../web/CommonAPISchemas.js";
import { PrismaJson } from "../Types.js";
import RPCManagerService from "../service/RPCManagerService.js";

export enum UserRPCType {
	SyncUserInfo = "SYNC_USER_INFO",
}

export function syncUserInfo(
	rpc: RPCManagerService,
	userId: bigint,
	data: Partial<IUser>,
) {
	const payload = {
		type: UserRPCType.SyncUserInfo,
		data: data as PrismaJson<Partial<IUser>>,
	};

	rpc.publish(`user:${userId}`, payload);
}
