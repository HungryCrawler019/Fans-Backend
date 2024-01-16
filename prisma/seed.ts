import "reflect-metadata";

import { PrismaClient, XPActionType } from "@prisma/client";
import { generatePasswordHashSalt } from "../common/auth/Hashing.js";
import SnowflakeService from "../common/service/SnowflakeService.js";

// All command line operations use reserved NodeID = 0x3ff, there's nearly zero chance of collision,
// unless we somehow happen to run them at the same time.

const snowflake = new SnowflakeService();
const prisma = new PrismaClient();

const seedInitialData = async () => {
	const now = new Date();

	const actions = [
		{
			action: "Subscribe",
			xp: 10,
			type: XPActionType.Multiple,
		},
		{
			action: "Donate",
			xp: 10,
			type: XPActionType.Multiple,
		},
		{
			action: "Like",
			xp: 3,
			type: XPActionType.Add,
		},
		{
			action: "Comment",
			xp: 10,
			type: XPActionType.Add,
		},
		{
			action: "Share",
			xp: 10,
			type: XPActionType.Add,
		},
		{
			action: "Purchase",
			xp: 10,
			type: XPActionType.Multiple,
		},
		{
			action: "Poll",
			xp: 5,
			type: XPActionType.Add,
		},
	];

	await Promise.all([
		prisma.user.create({
			data: {
				id: snowflake.gen(),
				username: "dimitar",
				displayName: "Dimitar gabres",
				email: "dimitar@gmail.com",
				password: await generatePasswordHashSalt("dimitar999#"),
				verifiedAt: now,
			},
		}),
		prisma.user.create({
			data: {
				id: snowflake.gen(),
				username: "venus",
				displayName: "venus",
				email: "venus@www.com",
				password: await generatePasswordHashSalt("venus"),
				type: "Fan",
				verifiedAt: now,
			},
		}),
		prisma.xPAction.createMany({
			data: actions,
		}),
	]);
};

seedInitialData()
	.then(() => {
		console.log("Seed for initial data is done!");
	})
	.catch((err) => {
		console.log(err);
		console.log("Seed error!");
	})
	.finally(() => {
		prisma.$disconnect();
	});
