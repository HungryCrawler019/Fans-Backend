import { Container } from "async-injection";
import { Logger } from "pino";
import { App, DISABLED } from "uWebSockets.js";
import PrismaService from "../common/service/PrismaService.js";
import RedisService from "../common/service/RedisService.js";
import WebSocketSession, {
	WebSocketWithSession,
	sessionFactory,
} from "./WebSocketSession.js";

export default async function main(container: Container) {
	container = container.clone();

	const logger = await container.resolve<Logger>("logger");
	const redis = await container.resolve(RedisService);
	const prisma = await container.resolve(PrismaService);

	const host = process.env.HOST_REALTIME ?? "::";
	const port = Number(process.env.PORT_REALTIME ?? 3001);

	const sessions = new Set<WebSocketSession>();

	const ws = App({}).ws("/channel", {
		compression: DISABLED,
		maxPayloadLength: 16384,
		open: async (ws) => {
			const session = await sessionFactory(container, ws);
			sessions.add(session);
		},
		message: (ws, message, isBinary) => {
			if (!isBinary) return;

			const wss = ws as WebSocketWithSession;
			wss.session?.onMessage(message);
		},
		close: (ws, code, message) => {
			const wss = ws as WebSocketWithSession;
			if (!wss.session) return;

			wss.session.onClose(code, message);
			sessions.delete(wss.session);
		},
	});

	ws.get("/api/health", (res) => {
		res.writeStatus("200 OK")
			.writeHeader("Content-Type", "application/json")
			.end('{"status":"ok"}');
	});

	ws.listen(host, port, () => {
		const hostnameURL = host.includes(":") ? `[${host}]` : host;
		logger.info(
			`Realtime service listening at http://${hostnameURL}:${port}`,
		);
	});
}
