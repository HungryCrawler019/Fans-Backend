import { Injectable } from "async-injection";
import type { APIGuild, APIRole } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

@Injectable()
class DiscordService {
	discordBotToken: string;

	/**
	 * Creates a Discord service
	 * @param discordBotToken A valid Discord bot token
	 */

	constructor(discordBotToken: string) {
		this.discordBotToken = discordBotToken;
	}

	/**
	 * Gets all Discord guilds an oauth2 user is in
	 * @param accessToken A valid oAuth2 access token
	 * @returns {Promise<APIGuild[] | undefined>} An array of guilds the user is in
	 */

	async getUserGuilds(accessToken: string): Promise<APIGuild[] | undefined> {
		const rest = new REST({
			authPrefix: "Bearer",
			version: "10",
		}).setToken(accessToken);

		// Fetches the guilds
		const guilds = (await rest.get(Routes.userGuilds())) as
			| APIGuild[]
			| undefined;

		if (!guilds?.length) return;
		return guilds;
	}

	/**
	 * Gets all roles in a specific Discord guild
	 * @param guildID Guild ID to return role information from
	 * @returns {Promise<APIRole[] | undefined} An array of roles
	 */

	async getGuildRoles(guildID: string): Promise<APIRole[] | undefined> {
		const rest = new REST({
			authPrefix: "Bot",
			version: "10",
		}).setToken(this.discordBotToken);

		// Fetches the guild roles
		const roles = (await rest.get(Routes.guildRoles(guildID))) as
			| APIRole[]
			| undefined;

		if (!roles?.length) return;
		return roles;
	}
}

export async function discordFactory(): Promise<DiscordService> {
	if (!process.env.DISCORD_BOT_TOKEN) {
		throw new Error("Missing Discord bot token in the configuration file.");
	}

	return new DiscordService(process.env.DISCORD_BOT_TOKEN);
}

export default DiscordService;
