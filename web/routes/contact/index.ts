import APIErrors from "../../errors/index.js";
import { SendEmailData } from "../../../common/service/EmailerService.js";
import EmailerService from "../../../common/service/EmailerService.js";
import { FastifyTypebox } from "../../types.js";
import { SendMessageReqBody } from "./schemas.js";
import { SendMessageReqBodyValidator } from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const emailService = await container.resolve(EmailerService);

	fastify.post<{ Body: SendMessageReqBody }>(
		"/",
		{
			schema: { body: SendMessageReqBodyValidator },
		},
		async (request, reply) => {
			try {
				const { name, email, subject, question } = request.body;
				// todo: Send verification email to user
				const emailData: SendEmailData = {
					sender: email,
					to: [process.env.SENDINBLUE_SENDER || "support@fyp.fans"],
					textContent: removeTags(question),
					subject: subject,
				};
				await emailService.sendEmail(emailData);

				return reply
					.status(202)
					.send({ message: "Contact email is sent successfully." });
			} catch (err) {
				request.log.error(err, "Error on get all categories");
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}

function removeTags(str: string) {
	if (str === null || str === "") return "";
	else str = str.toString();

	// Regular expression to identify HTML tags in
	// the input string. Replacing the identified
	// HTML tag with a null string.
	return str.replace(/(<([^>]+)>)/gi, "");
}
