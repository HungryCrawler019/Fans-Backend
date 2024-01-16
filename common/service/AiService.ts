import { Injectable } from "async-injection";

interface AiServiceFormBase {
	model: "gpt-4" | "gpt-3.5-turbo";
	function: string;
}

export interface AiServiceFormRespond extends AiServiceFormBase {
	function: "respond";
	content: "yes" | "no";
	convo: object;
}

export interface AiServiceFormSummarize extends AiServiceFormBase {
	function: "summarize";
	type: "shorthand" | "paragraph" | "both";
	convo: object;
}

export interface AiServiceFormCaption extends AiServiceFormBase {
	function: "caption";
	language: "english" | "czech" | "german";
	description: string;
}

export type AiServiceForm =
	| AiServiceFormCaption
	| AiServiceFormRespond
	| AiServiceFormSummarize;

export interface AiServiceOutput {
	message: string;
	data: object;
}
@Injectable()
class AiService {
	readonly serviceUrl: string;
	private readonly serviceToken: string;

	constructor(_serviceUrl: string, _serviceToken: string) {
		this.serviceUrl = _serviceUrl;
		this.serviceToken = _serviceToken;
	}

	private async sendRequest<ServerResponse>(
		url: string,
		data: Object,
	): Promise<ServerResponse> {
		return fetch(url, data)
			.then((response) => response.json())
			.then((responseData) => responseData as ServerResponse);
	}

	async constructRequest(data: AiServiceForm): Promise<AiServiceOutput> {
		let requestData;

		switch (data.function) {
			case "respond":
				requestData = {
					content: data.content,
					convo: data.convo,
					model: data.model,
				};
				break;
			case "summarize":
				requestData = {
					convo: data.convo,
					mode: data.type,
					model: data.model,
				};
				break;
			case "caption":
				requestData = {
					language: data.language,
					description: data.description,
					model: data.model,
				};
				break;
		}
		return await this.sendRequest<AiServiceOutput>(
			`${this.serviceUrl}/${data.function}`,
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					Authorization: this.serviceToken,
				},
				body: JSON.stringify(requestData),
			},
		);
	}
}

export default AiService;
