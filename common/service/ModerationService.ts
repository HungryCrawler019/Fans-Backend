import { Injectable } from "async-injection";

interface ModerationServiceForm {
	function: "analyze" | "attributes";
	content: string;
}

export interface IridiumServiceOutput {
	message: string;
	data: object;
}

@Injectable()
class ModerationService {
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

	async constructRequest(
		data: ModerationServiceForm,
	): Promise<IridiumServiceOutput> {
		const requestData = { content: data.content };

		return await this.sendRequest<IridiumServiceOutput>(
			`${this.serviceUrl}/moderation/${data.function}`,
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

export default ModerationService;
