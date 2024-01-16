import * as amqp from "amqplib";

export async function amqpClientFactory(): Promise<AmqpClientService> {
	return await AmqpClientService.init(
		process.env.AMQP_URL!!,
		process.env.AMQP_WEBHOOK_EXCHANGE!!,
	);
}

export class AmqpClientService {
	private constructor(
		private url: string,
		private exchange: string,
		private connection: amqp.Connection,
		private channel: amqp.Channel,
	) {}

	public static async init(
		url: string,
		exchange: string,
	): Promise<AmqpClientService> {
		const conn = await amqp.connect(url);
		const channel = await conn.createChannel();
		return new AmqpClientService(url, exchange, conn, channel);
	}

	public async reconnect(): Promise<void> {
		this.connection = await amqp.connect(this.url);
		this.channel = await this.connection.createChannel();
	}

	public async publish(data: string): Promise<void> {
		this.channel.publish(this.exchange, "", Buffer.from(data), {});
	}

	/**
	 * Only call this once, it will create a new channel + consumer each time
	 * @param callback function to be executed
	 */
	public async subscribe(
		callback: (data: string) => Promise<void> | void,
	): Promise<void> {
		const queue = await this.channel.assertQueue("", {
			exclusive: true,
			autoDelete: true,
		});
		await this.channel.bindQueue(queue.queue, this.exchange, "100");
		this.channel
			.consume(queue.queue, async (data: amqp.ConsumeMessage | null) => {
				if (data) {
					try {
						await callback(data.content.toString());
						this.channel.ack(data, false);
					} catch (err) {
						console.error("AMQP message errored", err);
						this.channel.nack(data, false, true);
					}
				}
			})
			.catch((error) =>
				console.log("Failed to consume from queue:", error),
			);
	}
}
