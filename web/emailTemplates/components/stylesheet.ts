import fs from "fs/promises";
import CleanCSS from "clean-css";
import { Container } from "async-injection";
import { Logger } from "pino";

async function loadOptimizedStylesheet() {
	const stylesheet = await fs.readFile(
		"web/emailTemplates/styles.css",
		"utf-8",
	);

	const output = new CleanCSS({}).minify(stylesheet);
	if (output.errors.length > 0) {
		throw new Error(output.errors.join("\n"));
	}

	return output.styles;
}

export let stylesheet = await loadOptimizedStylesheet();

export async function startWatching(container: Container) {
	if (process.env.NODE_ENV === "production") return;

	const logger = await container.resolve<Logger>("logger");

	(async () => {
		for await (const path of fs.watch("web/emailTemplates/styles.css")) {
			logger.info("Stylesheet changed, reloading...");
			stylesheet = await loadOptimizedStylesheet();
		}
	})();
}
