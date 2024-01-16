import { Injectable } from "async-injection";
import EmailerService, { SendEmailData } from "./EmailerService.js";
import SendInBlueEmailerService from "./SendInBlueEmailerService.js";
import { renderToHTML } from "../../web/emailTemplates/render.js";
import { ChargebackNoticeTemplate } from "../../web/emailTemplates/templates/ChargebackNoticeTemplate.js";
import { ChargebackNoticeToCreator } from "../../web/emailTemplates/templates/ChargebackNoticeToCreator.js";
import { SubscriptionConfirmation } from "../../web/emailTemplates/templates/SubscriptionConfirmation.js";
import { TipConfirmation } from "../../web/emailTemplates/templates/TipConfirmation.js";
import { NewSubscriptionAlert } from "../../web/emailTemplates/templates/NewSubscriptionAlert.js";
import { OneTimePurchaseConfirmation } from "../../web/emailTemplates/templates/OneTimePurchaseConfirmation.js";
import { OneTimePurchaseAlert } from "../../web/emailTemplates/templates/OneTimePurchaseAlert.js";
import { TipReceived } from "../../web/emailTemplates/templates/TipReceived.js";
import { MessageNotification } from "../../web/emailTemplates/templates/MessageNotification.js";
import { NewPostNotification } from "../../web/emailTemplates/templates/NewPostNotification.js";

@Injectable()
class EmailTemplateSenderService {
	private emailerService: EmailerService;

	constructor(emailerService: EmailerService) {
		this.emailerService = emailerService;
	}

	async sendNewPostNotification(
		email: string,
		params: {
			recipientName: string;
			creatorName: string;
			postLink: string;
		},
	): Promise<void> {
		const htmlContent = renderToHTML(NewPostNotification, params);
		const emailData: SendEmailData = {
			sender: "support@fyp.fans",
			to: [email],
			subject: `New Post from ${params.creatorName}`,
			htmlContent: htmlContent,
		};
		await this.emailerService.sendEmail(emailData);
	}

	async sendMessageNotification(
		email: string,
		params: {
			recipientName: string;
			senderName: string;
			messagePreview: string;
		},
	): Promise<void> {
		const htmlContent = renderToHTML(MessageNotification, params);
		const emailData: SendEmailData = {
			sender: "support@fyp.fans",
			to: [email],
			subject: `New Message from ${params.senderName}`,
			htmlContent: htmlContent,
		};
		await this.emailerService.sendEmail(emailData);
	}

	async sendChargebackNoticeToCreator(
		email: string,
		params: {
			creatorName: string;
			fanName: string;
			transactionAmount: string;
		},
	): Promise<void> {
		const htmlContent = renderToHTML(ChargebackNoticeToCreator, params);
		const emailData: SendEmailData = {
			sender: "support@fyp.fans",
			to: [email],
			subject: `Chargeback Notice from ${params.fanName}`,
			htmlContent: htmlContent,
		};
		await this.emailerService.sendEmail(emailData);
	}

	async sendChargebackNotice(
		email: string,
		params: {
			creatorName: string;
			fanName: string;
			transactionAmount: string;
		},
	): Promise<void> {
		const htmlContent = renderToHTML(ChargebackNoticeTemplate, params);
		const emailData: SendEmailData = {
			sender: "support@fyp.fans",
			to: [email],
			subject: "Important Notice Regarding Your Recent Chargeback",
			htmlContent: htmlContent,
		};
		await this.emailerService.sendEmail(emailData);
	}

	async sendSubscriptionConfirmation(
		email: string,
		params: { fanName: string; creatorName: string; amount: string },
	): Promise<void> {
		const htmlContent = renderToHTML(SubscriptionConfirmation, params);
		const emailData: SendEmailData = {
			sender: "support@fyp.fans",
			to: [email],
			subject: "Confirmation of NEW Subscription!",
			htmlContent: htmlContent,
		};
		await this.emailerService.sendEmail(emailData);
	}

	async sendTipConfirmation(
		email: string,
		params: { fanName: string; creatorName: string },
	): Promise<void> {
		const htmlContent = renderToHTML(TipConfirmation, params);
		const emailData: SendEmailData = {
			sender: "support@fyp.fans",
			to: [email],
			subject: `Tip Confirmation to ${params.creatorName}`,
			htmlContent: htmlContent,
		};
		await this.emailerService.sendEmail(emailData);
	}

	async sendNewSubscriptionAlert(
		email: string,
		params: { creatorName: string; fanName: string },
	): Promise<void> {
		const htmlContent = renderToHTML(NewSubscriptionAlert, params);
		const emailData: SendEmailData = {
			sender: "support@fyp.fans",
			to: [email],
			subject: "Cha-Ching, New Subscription Alert!",
			htmlContent: htmlContent,
		};
		await this.emailerService.sendEmail(emailData);
	}

	async sendOneTimePurchaseConfirmation(
		email: string,
		params: { fanName: string; postUrl: string },
	): Promise<void> {
		const htmlContent = renderToHTML(OneTimePurchaseConfirmation, params);
		const emailData: SendEmailData = {
			sender: "support@fyp.fans",
			to: [email],
			subject: "One-Time Purchase Confirmation",
			htmlContent: htmlContent,
		};
		await this.emailerService.sendEmail(emailData);
	}

	async sendOneTimePurchaseAlert(
		email: string,
		params: {
			creatorName: string;
			fanName: string;
			postUrl: string;
			totalAmount: string;
		},
	): Promise<void> {
		const htmlContent = renderToHTML(OneTimePurchaseAlert, params);
		const emailData: SendEmailData = {
			sender: "support@fyp.fans",
			to: [email],
			subject: "Cha-Ching One-Time Purchase Alert!",
			htmlContent: htmlContent,
		};
		await this.emailerService.sendEmail(emailData);
	}

	async sendTipReceived(
		email: string,
		params: { creatorName: string; fanName: string },
	): Promise<void> {
		const htmlContent = renderToHTML(TipReceived, params);
		const emailData: SendEmailData = {
			sender: "support@fyp.fans",
			to: [email],
			subject: `You've Received a Tip from ${params.fanName}!`,
			htmlContent: htmlContent,
		};
		await this.emailerService.sendEmail(emailData);
	}
}

export async function emailTemplateSenderServiceFactory(): Promise<EmailTemplateSenderService> {
	const emailerService = new SendInBlueEmailerService();
	return new EmailTemplateSenderService(emailerService);
}

export default EmailTemplateSenderService;
