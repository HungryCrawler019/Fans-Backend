import { Container } from "async-injection";
import PrismaService from "../common/service/PrismaService.js";
import SnowflakeService from "../common/service/SnowflakeService.js";
import { generatePasswordHashSalt } from "../common/auth/Hashing.js";
import RedisService from "../common/service/RedisService.js";
import SessionManagerService from "../common/service/SessionManagerService.js";
import Dinero from "dinero.js";
import { PayoutLog, TransactionStatus } from "@prisma/client";
import { createReadStream, existsSync, readFileSync, readdirSync } from "fs";
import { createHash } from "crypto";

async function getPayoutInfo(prisma: PrismaService, payout: PayoutLog) {
	const paymentMethod = await prisma.payoutPaymentMethod.findUnique({
		where: {
			id: payout.payoutPaymentMethodId,
		},
	});

	const profile = await prisma.profile.findUnique({
		where: {
			id: payout.profileId,
		},
	});

	let paymentMethodData: any = undefined;

	if (paymentMethod) {
		const bankInfo = paymentMethod.bankInfoId
			? await prisma.bankInfo.findUnique({
					select: {
						firstName: true,
						lastName: true,
						address1: true,
						address2: true,
						city: true,
						state: true,
						zip: true,
						bankRoutingNumber: true,
						bankAccountNumber: true,
					},
					where: {
						id: paymentMethod.bankInfoId,
					},
			  })
			: undefined;

		paymentMethodData = {
			provider: paymentMethod.provider,
			bankInfo,
			paypalEmail: paymentMethod.paypalEmail,
			country: paymentMethod.country,
			entityType: paymentMethod.entityType,
			usCitizenOrResident: paymentMethod.usCitizenOrResident,
			updatedAt: paymentMethod.updatedAt.toISOString(),
		};
	}

	const payoutInfo = {
		id: payout.id.toString(),
		status: payout.status,
		profile: profile
			? {
					id: profile.id.toString(),
					displayName: profile.displayName,
					userId: profile.userId.toString(),
			  }
			: undefined,
		amount: Dinero({
			amount: payout.amount,
			currency: payout.currency as Dinero.Currency,
		}).toFormat(),
		paymentMethod: paymentMethodData,
		updatedAt: payout.updatedAt.toISOString(),
		createdAt: payout.createdAt.toISOString(),
	};

	return payoutInfo;
}

interface ICommand {
	help: string;
	syntax: string;
	run: (cmd: ICommand) => Promise<void>;
}

export default async function main(container: Container) {
	container = container.clone();
	const snowflake = await container.resolve(SnowflakeService);
	const prisma = await container.resolve(PrismaService);
	const redis = await container.resolve(RedisService);
	const sessionManager = await container.resolve(SessionManagerService);

	const args = process.argv.slice(2);

	const commands: Record<string, ICommand> = {
		createAdmin: {
			help: "Create an admin user",
			syntax: "fyp-cli createAdmin <username> <password>",
			run: async (cmd) => {
				const username = args[1];
				const password = args[2];

				if (!username || !password) {
					console.error(cmd.syntax);
					process.exit(1);
				}

				if (await prisma.adminUser.findFirst({ where: { username } })) {
					console.error(`User ${username} already exists`);
					process.exit(1);
				}

				await prisma.adminUser.create({
					data: {
						id: snowflake.gen(),
						username,
						password: await generatePasswordHashSalt(password),
						roles: ["root"],
					},
				});

				console.log(`User ${username} created`);
				process.exit(0);
			},
		},
		getSessions: {
			help: "Get all active sessions for specified user",
			syntax: "fyp-cli getSessions <userId>",
			run: async () => {
				const userId = args[1];

				if (!userId) {
					console.error(cmd.syntax);
					process.exit(1);
				}

				const [cur, sessions] = await redis.scan(
					"0",
					"MATCH",
					`sessions:${userId}.*`,
				);
				console.log("Active sessions:");
				for (const session of sessions) {
					console.log(session);
				}

				process.exit(0);
			},
		},
		createSessionToken: {
			help: "Create a session token for specified user",
			syntax: "fyp-cli createSessionToken <userId>",
			run: async () => {
				const userId = args[1];

				if (!userId) {
					console.error(cmd.syntax);
					process.exit(1);
				}

				const user = await prisma.user.findUnique({
					where: {
						id: BigInt(userId),
					},
				});

				if (!user) {
					console.error(`User ${userId} not found`);
					process.exit(1);
				}

				const session = await sessionManager.createSessionForUser(
					user.id.toString(),
				);

				console.log("User:", user);
				console.log(session.createToken());

				process.exit(0);
			},
		},
		destroyAllSessions: {
			help: "Destroy all sessions for specified user",
			syntax: "fyp-cli destroyAllSessions <userId>",
			run: async () => {
				const userId = args[1];

				if (!userId) {
					console.error(cmd.syntax);
					process.exit(1);
				}

				const user = await prisma.user.findUnique({
					where: {
						id: BigInt(userId),
					},
				});

				if (!user) {
					console.error(`User ${userId} not found`);
					process.exit(1);
				}

				await sessionManager.destroySessionsForUser(user.id.toString());

				console.log("All sessions destroyed");

				process.exit(0);
			},
		},
		banUser: {
			help: "Ban an user",
			syntax: "fyp-cli banUser <userId> <reason>",
			run: async () => {
				const userId = args[1];
				const reason = args[2];

				if (!userId || !reason) {
					console.error(cmd.syntax);
					process.exit(1);
				}

				const user = await prisma.user.findUnique({
					where: {
						id: BigInt(userId),
					},
				});

				if (!user) {
					console.error(`User ${userId} not found`);
					process.exit(1);
				}

				await prisma.user.update({
					where: {
						id: BigInt(userId),
					},
					data: {
						disabled: true,
					},
				});
				await prisma.profile.update({
					where: {
						userId: BigInt(userId),
					},
					data: {
						disabled: true,
					},
				});
				await prisma.banLog.create({
					data: {
						id: snowflake.gen(),
						userId: BigInt(userId),
						event: "ban",
						adminId: "console",
						reason,
					},
				});
				await sessionManager.destroySessionsForUser(user.id.toString());

				console.log(
					`User ${userId} has been banned by CONSOLE: ${reason}`,
				);

				process.exit(0);
			},
		},
		unbanUser: {
			help: "Unban an user",
			syntax: "fyp-cli unbanUser <userId> [reason]",
			run: async () => {
				const userId = args[1];
				const reason = args[2] ?? "";

				if (!userId) {
					console.error(cmd.syntax);
					process.exit(1);
				}

				const user = await prisma.user.findUnique({
					where: {
						id: BigInt(userId),
					},
				});

				if (!user) {
					console.error(`User ${userId} not found`);
					process.exit(1);
				}

				await prisma.user.update({
					where: {
						id: BigInt(userId),
					},
					data: {
						disabled: false,
					},
				});
				await prisma.profile.update({
					where: {
						userId: BigInt(userId),
					},
					data: {
						disabled: false,
					},
				});

				await prisma.banLog.create({
					data: {
						id: snowflake.gen(),
						userId: BigInt(userId),
						event: "unban",
						adminId: "console",
						reason,
					},
				});

				console.log(
					`User ${userId} has been unbanned by CONSOLE: ${
						reason === "" ? "(no reason given)" : reason
					}`,
				);

				process.exit(0);
			},
		},
		searchUsers: {
			help: "Search users by username, email or ID",
			syntax: "fyp-cli searchUsers <query>",
			run: async () => {
				const query = args[1];

				if (!query) {
					console.error(cmd.syntax);
					process.exit(1);
				}

				let userId: bigint | undefined;
				try {
					userId = BigInt(query);
				} catch {
					//
				}

				const users = await prisma.user.findMany({
					include: {
						profile: true,
					},
					where: {
						OR: [
							{
								username: {
									contains: query,
									mode: "insensitive",
								},
							},
							{
								email: {
									contains: query,
									mode: "insensitive",
								},
							},
							{
								displayName: {
									contains: query,
									mode: "insensitive",
								},
							},
							{
								profile: {
									displayName: {
										contains: query,
										mode: "insensitive",
									},
								},
							},
							{
								id: {
									equals: userId,
								},
							},
						],
					},
				});

				console.log("Found users:");
				for (const user of users) {
					console.log({
						id: user.id.toString(),
						username: user.username,
						email: user.email,
						displayName: user.displayName,
						disabled: user.disabled,
						profile: user.profile
							? {
									id: user.profile.id.toString(),
									displayName: user.profile.displayName,
									disabled: user.profile.disabled,
									profileLink: user.profile.profileLink,
							  }
							: undefined,
					});
				}

				process.exit(0);
			},
		},
		listPayouts: {
			help: "List payouts",
			syntax: "fyp-cli listPayouts",
			run: async () => {
				const payouts = await prisma.payoutLog.findMany({});
				for (const payout of payouts) {
					const payoutInfo = await getPayoutInfo(prisma, payout);
					console.log(JSON.stringify(payoutInfo, null, 2));
				}

				process.exit(0);
			},
		},
		setPayoutStatus: {
			help: "Sets the status of a specified payout",
			syntax: "fyp-cli setPayoutStatus <payoutId> <status>",
			run: async () => {
				const payoutId = args[1];
				const statusStr = args[2]?.toLowerCase();

				if (!payoutId || !statusStr) {
					console.error(cmd.syntax);
					process.exit(1);
				}

				const validStatuses = new Map<string, TransactionStatus>(
					Object.keys(TransactionStatus).map((key) => [
						key.toLowerCase(),
						TransactionStatus[
							key as keyof typeof TransactionStatus
						],
					]),
				);

				const status = validStatuses.get(statusStr);

				if (!status) {
					console.error(
						`Invalid status ${statusStr}. Valid statuses are: ${Array.from(
							validStatuses.keys(),
						).join(", ")}`,
					);
					process.exit(1);
				}

				const payout = await prisma.payoutLog.findUnique({
					where: {
						id: BigInt(payoutId),
					},
				});

				if (!payout) {
					console.error(`Payout ${payoutId} not found`);
					process.exit(1);
				}

				const updatedPayout = await prisma.payoutLog.update({
					where: {
						id: BigInt(payoutId),
					},
					data: {
						status,
					},
				});

				console.log(`Payout ${payoutId} status updated to ${status}`);
				const payoutInfo = await getPayoutInfo(prisma, updatedPayout);
				console.log(JSON.stringify(payoutInfo, null, 2));
				process.exit(0);
			},
		},
		syncPrismaChecksums: {
			help: "Syncs the checksums of all Prisma migrations",
			syntax: "fyp-cli syncPrismaChecksums",
			run: async () => {
				if (!existsSync("./prisma/migrations")) {
					console.error("Prisma migrations directory does not exist");
					process.exit(1);
				}

				const migrations = readdirSync("./prisma/migrations");

				for (const migration of migrations) {
					const migrationSqlPath = `./prisma/migrations/${migration}/migration.sql`;

					if (!existsSync(migrationSqlPath)) {
						continue;
					}

					const stream = createReadStream(migrationSqlPath);
					const sha256sum = createHash("sha256");

					for await (const chunk of stream) {
						sha256sum.update(chunk);
					}

					const checksum = sha256sum.digest("hex");

					const currentHash =
						await prisma.$queryRaw`SELECT checksum FROM _prisma_migrations WHERE migration_name = ${migration}`.then(
							(c) =>
								(c as [{ checksum: string }] | undefined)?.[0]
									?.checksum,
						);
					if (currentHash === undefined) {
						console.log(
							`Migration ${migration} checksum: ${checksum} - WAS NOT APPLIED`,
						);
					}

					console.log(
						`Migration ${migration} checksum: ${checksum} (current: ${currentHash})`,
					);

					if (currentHash !== checksum) {
						console.log(
							`Fixing checksum for migration ${migration}`,
						);

						await prisma.$queryRaw`UPDATE _prisma_migrations SET checksum = ${checksum} WHERE migration_name = ${migration}`;
					}
				}

				process.exit(0);
			},
		},
	};

	if (
		args.length < 1 ||
		!Object.prototype.hasOwnProperty.call(commands, args[0])
	) {
		console.error("Usage: fyp-cli <command>");
		console.error("Available commands:");
		for (const cmd in commands) {
			const command = commands[cmd as keyof typeof commands];
			console.error(`- ${cmd} ${command.syntax} - ${command.help}`);
		}
		process.exit(1);
	}

	const cmd = commands[args[0] as keyof typeof commands];
	await cmd.run(cmd);
}
