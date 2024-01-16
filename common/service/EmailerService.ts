export interface SendEmailData {
	/**
	 * The email address of the sender
	 */
	sender: string;

	/**
	 * The email address of the recipient(s)
	 */
	to: string[];

	textContent?: string;

	htmlContent?: string;

	subject: string;

	attachment?: { name: string; content: string }[];
}

export default abstract class EmailerService {
	abstract sendEmail(email: SendEmailData): Promise<void>;
}
