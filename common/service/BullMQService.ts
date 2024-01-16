import { Injectable, Injector } from "async-injection";
import { Queue, QueueOptions, Worker, Processor } from "bullmq";
import RedisService from "./RedisService.js";

@Injectable()
class BullMQService {
	#redis: RedisService;

	constructor(redis: RedisService) {
		this.#redis = redis;
	}

	/**
	 * Creates an instance of a {@link Queue}
	 * @param name The name of the queue
	 */
	public createQueue<
		DataType = any,
		ResultType = any,
		NameType extends string = string,
	>(
		name: string,
		opts: QueueOptions = {},
	): Queue<DataType, ResultType, NameType> {
		const options = { ...opts, connection: this.#redis };
		return new Queue<DataType, ResultType, NameType>(name, options);
	}

	/**
	 * Creates an instance of a {@link Worker}
	 * @param name The name of the queue
	 */
	public createWorker<
		DataType = any,
		ResultType = any,
		NameType extends string = string,
	>(
		name: string,
		processor?: string | null | Processor<DataType, ResultType, NameType>,
		opts: WorkerOptions = {},
	): Worker<DataType, ResultType, NameType> {
		const options = { ...opts, connection: this.#redis };
		return new Worker<DataType, ResultType, NameType>(
			name,
			processor,
			options,
		);
	}
}

export async function bullMQFactory(
	injector: Injector,
): Promise<BullMQService> {
	const redis = await injector.resolve(RedisService);
	return new BullMQService(redis);
}

export default BullMQService;
