import "reflect-metadata";

import Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";
import { Container } from "async-injection";
import dotenv from "dotenv";
import pino from "pino";
import { isTrueString, nonNaN } from "./common/Validation.js";
import AgeCheckerService, {
	ageCheckerFactory,
} from "./common/service/AgeCheckerService.js";
import {
	AmqpClientService,
	amqpClientFactory,
} from "./common/service/AmqpClientService.js";
import AuthorizeNetService, {
	authorizeNetFactory,
} from "./common/service/AuthorizeNetService.js";
import BullMQService, {
	bullMQFactory,
} from "./common/service/BullMQService.js";
import FeesCalculatorService, {
	feesCalculatorFactory,
} from "./common/service/FeesCalculatorService.js";
import GemExchangeService, {
	gemExchangeFactory,
} from "./common/service/GemExchangeService.js";
import MediaUploadService, {
	mediaUploadFactory,
} from "./common/service/MediaUploadService.js";
import NotificationService, {
	notificationFactory,
} from "./common/service/NotificationService.js";
import OAuth2Service, {
	oAuth2Factory,
} from "./common/service/OAuth2Service.js";
import PayPalService, {
	paypalFactory,
} from "./common/service/PayPalService.js";
import PayoutService, {
	payoutFactory,
} from "./common/service/PayoutService.js";
import PrismaService, {
	prismaFactory,
} from "./common/service/PrismaService.js";
import RPCManagerService, {
	rpcManagerFactory,
} from "./common/service/RPCManagerService.js";
import RedisService, { redisFactory } from "./common/service/RedisService.js";
import S3Service, { s3Factory } from "./common/service/S3Service.js";
import ScraperService, {
	scraperFactory,
} from "./common/service/ScraperService.js";
import { sendInBlueEmailerFactory } from "./common/service/SendInBlueEmailerService.js";
import EmailTemplateSenderService from "./common/service/EmailTemplateSenderService.js";
import SessionManagerService from "./common/service/SessionManagerService.js";
import SnowflakeService, {
	snowflakeFactory,
} from "./common/service/SnowflakeService.js";
import StripeService, {
	stripeFactory,
} from "./common/service/StripeService.js";
import TaxJarService, {
	taxJarFactory,
} from "./common/service/TaxJarService.js";
import { registerFormats } from "./common/validators/validation.js";

import AiService from "./common/service/AiService.js";
import CloudflareStreamService, {
	cloudflareStreamFactory,
} from "./common/service/CloudflareStreamService.js";
import DiscordService, {
	discordFactory,
} from "./common/service/DiscordService.js";
import EmailerService from "./common/service/EmailerService.js";
import InboxManagerService, {
	inboxManagerFactory,
} from "./common/service/InboxManagerService.js";
import OndatoService, {
	ondatoFactory,
} from "./common/service/OndatoService.js";
import SiftService, { siftFactory } from "./common/service/SiftService.js";
import { chimeFactory, ChimeService } from "./common/service/ChimeService.js";
import { MeetingService } from "./common/service/MeetingService.js";

dotenv.config();

BigInt.prototype.toJSON = function () {
	return this.toString();
};

registerFormats();

const logger = pino.default({
	level: process.env.LOG_LEVEL ?? "info",
});

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	integrations: (integrations) => {
		if (isTrueString(process.env.SENTRY_PROFILING_ENABLED)) {
			logger.info("Enabling Sentry profiling integration");
			integrations.push(new ProfilingIntegration());
		}

		return integrations;
	},
	tracesSampleRate: nonNaN(process.env.SENTRY_TRACES_SAMPLE_RATE) ?? 1.0,
	profilesSampleRate: nonNaN(process.env.SENTRY_PROFILES_SAMPLE_RATE) ?? 1.0,
});

let services = process.env.SERVICES?.split(",") ?? [];

if (!services.length) {
	throw new Error("Missing SERVICES environment variable");
}

if (services.includes("web")) {
	logger.warn(
		"!!! The 'web' service has been renamed to 'api'. Please update your .env file !!!",
	);
	process.exit(1);
}

if (services.includes("chat")) {
	logger.warn(
		"!!! The 'chat' service has been renamed to 'realtime'. Please update your .env file !!!",
	);
	process.exit(1);
}

const validServices = [
	"admin",
	"api",
	"realtime",
	"cli",
	"public-api",
	"webhook",
];

services = services.filter((service) => validServices.includes(service));

if (!services.length) {
	throw new Error("No valid services found in SERVICES environment variable");
}

const container = new Container();

container.bindConstant("logger", logger);
container.bindAsyncFactory(AgeCheckerService, ageCheckerFactory).asSingleton();
container.bindClass(AiService).asSingleton();
container.bindAsyncFactory(AmqpClientService, amqpClientFactory).asSingleton();
container
	.bindAsyncFactory(AuthorizeNetService, authorizeNetFactory)
	.asSingleton();
container.bindAsyncFactory(BullMQService, bullMQFactory).asSingleton();
container
	.bindAsyncFactory(CloudflareStreamService, cloudflareStreamFactory)
	.asSingleton();
container.bindAsyncFactory(DiscordService, discordFactory).asSingleton();
container
	.bindAsyncFactory(EmailerService, sendInBlueEmailerFactory)
	.asSingleton();
container.bindClass(EmailTemplateSenderService).asSingleton();
container
	.bindAsyncFactory(FeesCalculatorService, feesCalculatorFactory)
	.asSingleton();
container
	.bindAsyncFactory(GemExchangeService, gemExchangeFactory)
	.asSingleton();
container
	.bindAsyncFactory(InboxManagerService, inboxManagerFactory)
	.asSingleton();
container
	.bindAsyncFactory(MediaUploadService, mediaUploadFactory)
	.asSingleton();
container
	.bindAsyncFactory(NotificationService, notificationFactory)
	.asSingleton();
container.bindAsyncFactory(OAuth2Service, oAuth2Factory).asSingleton();
container.bindAsyncFactory(PayoutService, payoutFactory).asSingleton();
container.bindAsyncFactory(PayPalService, paypalFactory).asSingleton();
container.bindAsyncFactory(PrismaService, prismaFactory).asSingleton();
container.bindAsyncFactory(RedisService, redisFactory);
container.bindAsyncFactory(RPCManagerService, rpcManagerFactory).asSingleton();
container.bindAsyncFactory(OndatoService, ondatoFactory).asSingleton();
container.bindAsyncFactory(S3Service, s3Factory).asSingleton();
container.bindAsyncFactory(ScraperService, scraperFactory).asSingleton();
container.bindClass(SessionManagerService).asSingleton();
container.bindAsyncFactory(SnowflakeService, snowflakeFactory).asSingleton();
container.bindAsyncFactory(StripeService, stripeFactory).asSingleton();
container.bindAsyncFactory(TaxJarService, taxJarFactory).asSingleton();
container.bindAsyncFactory(SiftService, siftFactory).asSingleton();
container.bindAsyncFactory(ChimeService, chimeFactory).asSingleton();
container.bindClass(MeetingService).asSingleton();

for (let service of services) {
	logger.info(`Starting service: ${service}`);

	// TODO: TypeScript is broken

	if (service === "api") service = "web"; // TODO: rename `web` folder to `api`

	const m = await import(`./${service}/index.js`);
	m.default(container).catch((error: any) => {
		logger.error(
			error,
			`An error occurred while starting service ${service}`,
		);
		process.exit(1);
	});
}
