import { User, XPActionType } from "@prisma/client";
import { Injectable, Injector } from "async-injection";
import PrismaService from "./PrismaService.js";
import SnowflakeService from "./SnowflakeService.js";
import { ActionType } from "../Define.js";

@Injectable()
class XPService {
	constructor(
		private prisma: PrismaService,
		private snowflake: SnowflakeService,
	) {}

	async addXPLog(
		action: ActionType,
		amount: number,
		userId: bigint,
		creatorId: bigint,
		detail?: any,
		verifier?: User,
		force: boolean = false,
	) {
		const xpAction = await this.prisma.xPAction.findFirst({
			where: { action },
		});

		if (!xpAction) {
			throw new Error("Invalid action!");
		}

		if (!force) {
			const verified = await this.verifyXPLog(xpAction.type, detail);
			if (!verified) {
				throw "Not verified";
			}
		}

		const xp = xpAction.type === "Add" ? xpAction.xp : amount * xpAction.xp;

		const userLevel = await this.prisma.userLevel.findFirst({
			where: {
				creatorId: BigInt(creatorId),
				userId: BigInt(userId),
			},
		});

		const currentLevel = userLevel ? userLevel.level : 1;
		const currentXp = userLevel ? userLevel.xp + xp : xp;
		let nextLevel = currentLevel;
		let nextXp = currentXp;
		for (;;) {
			if (nextLevel >= 100) break;
			const requiredXp = nextLevel * 5;
			if (nextXp >= requiredXp) {
				nextLevel++;
				nextXp -= requiredXp;
			} else {
				break;
			}
		}

		const roles = await this.prisma.role.findMany({
			where: { profileId: creatorId },
			orderBy: { level: "desc" },
		});
		let nextRoleId: bigint | undefined = undefined;
		for (const role of roles) {
			if (nextLevel >= role.level) {
				nextRoleId = role.id;
				break;
			}
		}

		await this.prisma.$transaction(async (prisma) => {
			await prisma.xPLog.create({
				data: {
					id: this.snowflake.gen(),
					user: { connect: { id: userId } },
					creator: { connect: { id: creatorId } },
					action: xpAction.type,
					amount,
					xp,
					verifiedAt: new Date(),
				},
			});

			if (userLevel) {
				await prisma.userLevel.update({
					where: {
						userId_creatorId: {
							userId: BigInt(userId),
							creatorId: BigInt(creatorId),
						},
					},
					data: {
						level: nextLevel,
						xp: nextXp,
						roleId: nextRoleId,
					},
				});
			} else {
				await prisma.userLevel.create({
					data: {
						id: this.snowflake.gen(),
						user: { connect: { id: userId } },
						creator: { connect: { id: creatorId } },
						level: nextLevel,
						xp: nextXp,
						role: { connect: { id: nextRoleId } },
					},
				});
			}
		});
	}

	async handleUpdateRole(creatorId: bigint) {
		const userLevels = await this.prisma.userLevel.findMany({
			where: { creatorId },
		});
		const roles = await this.prisma.role.findMany({
			where: { profileId: creatorId },
			orderBy: { level: "desc" },
		});

		const newRoles = userLevels
			.map((l) => {
				let newRoleId = l.roleId;
				for (const role of roles) {
					if (l.level >= role.level) {
						newRoleId = role.id;
						break;
					}
				}
				return { id: l.id, roleId: newRoleId, oldRoleId: l.roleId };
			})
			.filter((l) => l.roleId !== l.oldRoleId);

		await this.prisma.userLevel.updateMany({
			data: newRoles.map((n) => ({
				id: n.id,
				roleId: n.roleId,
			})),
		});
	}

	async getRequiredXpToNextLevel(userId: bigint, creatorId: bigint) {
		const userLevel = await this.prisma.userLevel.findUnique({
			where: {
				userId_creatorId: {
					userId: userId,
					creatorId: creatorId,
				},
			},
		});
		if (!userLevel) {
			throw "There is no level yet.";
		}
		return {
			requiredXp: userLevel.level * 5 - userLevel.xp,
			nextLevel: userLevel.level + 1,
		};
	}

	async verifyXPLog(action: XPActionType, detail: any) {
		return true;
	}
}

export async function xpServiceFactory(injector: Injector): Promise<XPService> {
	const prisma = await injector.resolve(PrismaService);
	const snowflake = await injector.resolve(SnowflakeService);

	return new XPService(prisma, snowflake);
}

export default XPService;
