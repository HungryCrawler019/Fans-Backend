import { Container } from "async-injection";
import { AmqpClientService } from "../common/service/AmqpClientService.js";
import PrismaService from "../common/service/PrismaService.js";
import SnowflakeService from "../common/service/SnowflakeService.js";
import { WebhookEvent } from "../common/webhook/schema.js";

type WebhookProxyPayload = {
	event: WebhookEvent;
	target: string;
	appId: string;
	signature: string;
};

const PROXY_URL = process.env.WEBHOOK_PROXY_URL;
const PROXY_TOKEN = process.env.WEBHOOK_PROXY_TOKEN;

export default async function main(container: Container) {
	const client = await container.resolve(AmqpClientService);
	const snowflakes = await container.resolve(SnowflakeService);
	const prisma = await container.resolve(PrismaService);

	if (!PROXY_URL) throw new Error("Missing WEBHOOK_PROXY_URL");
	if (!PROXY_TOKEN) throw new Error("Missing WEBHOOK_PROXY_TOKEN");

	await client.subscribe(async (data: string) => {
		const event: WebhookEvent = JSON.parse(data);
		const creatorId = event.data.creatorId;
		const applications = await prisma.application.findMany({
			where: {
				userId: BigInt(creatorId),
			},
		});
		if (!applications) {
			return;
		}
		for (const app of applications) {
			const webhookResult = await prisma.webhookTarget.findMany({
				where: {
					appId: app.id,
				},
			});
			if (!webhookResult) {
				continue;
			}
			for (const webhook of webhookResult) {
				const payload: WebhookProxyPayload = {
					appId: app.id.toString(),
					signature: await createHMAC(event, webhook.secret),
					target: webhook.target,
					event,
				};
				let run = true;
				while (run) {
					const resp = await proxyRequest(JSON.stringify(payload));
					if (resp && resp.status == 201) {
						run = false;
						break; // successfully back out
					}
					if (resp.status == 200) {
						await prisma.webhookRetry.create({
							data: {
								id: snowflakes.gen(),
								payload: JSON.stringify(payload),
								targetId: webhook.id,
								retryAfter: nowPlus(1, "minutes"),
								retryCount: 0,
							},
						});
						run = false;
						break;
					}
					await delay(5000); // retry sending, worker seems to be offline, block subscriber
				}
			}
		}
	});

	await runScheduledRetries(prisma);
}

async function runScheduledRetries(prisma: PrismaService) {
	const retries = await prisma.webhookRetry.findMany({
		where: {
			retryAfter: {
				gt: new Date(),
			},
		},
		include: {
			target: true,
		},
	});
	for (const retry of retries) {
		const resp = await proxyRequest(retry.payload);
		if (!resp || resp.status !== 201) {
			let retryCount = retry.retryCount;
			let retryAfter = new Date();
			if (resp && resp.status === 200) {
				retryCount += 1;
				retryAfter = getBackoff(retryCount);
			}
			await prisma.webhookRetry.update({
				where: {
					id: retry.id,
				},
				data: {
					retryCount: retryCount,
					retryAfter: retryAfter,
				},
			});
		} else {
			await prisma.webhookRetry.delete({
				where: {
					id: retry.id,
				},
			});
		}
	}
	setTimeout(async () => await runScheduledRetries(prisma), 60000);
}

async function proxyRequest(payload: string): Promise<Response> {
	return await fetch(PROXY_URL!, {
		headers: {
			"x-proxy-token": PROXY_TOKEN!,
			"content-type": "application/json",
		},
		body: payload,
		method: "POST",
	});
}

function getBackoff(retryCount: number): Date {
	switch (retryCount) {
		case 1:
			return nowPlus(15, "minutes");
		case 2:
			return nowPlus(30, "minutes");
		case 3:
			return nowPlus(1, "hours");
		case 4:
			return nowPlus(3, "hours");
		case 5:
			return nowPlus(6, "hours");
		case 6:
			return nowPlus(12, "hours");
		case 7:
			return nowPlus(1, "days");
		case 8:
			return nowPlus(3, "days");
	}
	return nowPlus(7, "days");
}

function nowPlus(time: number, unit: "minutes" | "hours" | "days"): Date {
	let multi = 0;
	switch (unit) {
		case "minutes":
			multi = 60000;
			break;
		case "hours":
			multi = 3600000;
			break;
		case "days":
			multi = 86400000;
			break;
	}
	if (multi === 0) {
		throw new Error("Invalid unit");
	}
	return new Date(new Date().getTime() + time * multi);
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createHMAC(object: any, secret: string): Promise<string> {
	let stringData: string;
	if (typeof object === "string") {
		stringData = object;
	} else {
		stringData = JSON.stringify(object);
	}

	const encoder = new TextEncoder();
	const data = encoder.encode(stringData);

	const keyData = encoder.encode(secret);
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		keyData,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);

	const hashArray = Array.from(new Uint8Array(signature));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
