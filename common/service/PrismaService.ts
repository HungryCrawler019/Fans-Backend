import Prisma, { PrismaClient } from "@prisma/client";
import { Injectable } from "async-injection";

@Injectable()
class PrismaService extends PrismaClient {
	constructor() {
		super();
	}

	public getModule(): typeof Prisma {
		return { ...Prisma, PrismaClient: PrismaService as any };
	}
}

export async function prismaFactory() {
	return new PrismaService();
}

export default PrismaService;
