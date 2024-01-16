import { assert } from "chai";
import CloudflareStreamService from "../../../common/service/CloudflareStreamService.js";
import pino from "pino";

describe("CloudflareStreamService tests", () => {
	const logger = pino.default();
	const keyId = "testkey";
	const jwk = Buffer.from(
		JSON.stringify({
			p: "0mkPgCkPq3YDWksE-Jz79UD5IeipjcIcmNxF3sbK_BYrYcwm9gZ8kfc_gXbE1Cj8s9b7GQiJafNq4gAMBhIH8FDxs_w9mC5fKKbb105F-tNbvD5k-e2Go_bLRx8wfkNBvFgaMaaT3gLCLSoT-A60cOn5u_PIpWzDCHv3wcPEDMk",
			kty: "RSA",
			q: "w-6FzI4lmif6VUusRyAR8bV0pA_aQSUOYtw8O4eKzvF2ekMzSP5d-u9OsQfhE3YV_iMnL0SmRNfe7QStL0VmfSzWM5eIRKSWebyBI3OjYYjDHpEN1UFkhdkfIATpeyPIzHwzjnb1QsSvdVTe3h-Esp-bc7X8TJeGP1okFxOlZa8",
			d: "RyMB36r0S2gvHGuY84zA6bRd_lbuh9w_QCAnuN1U7McNBF-WX1CLEIpCE_ktiegqKMIZPjz-Zs1StPhlsgyarl_TplswMaHgVwh4dRPXTDLB9qBvRytoK9RVnpYaoCSDTt6ICfZTCGaq2MJWYT10y_BYfh8J3UST110RJTpZVJqIbPo51UerW6-riTF6hCruseA3r2P1-yLqp1Cova18CAZd4F_o8GPy4lkTRShJG0HE_Va2BNTmO1Py4jxi9wqaHTEAZYF8X8nr2oMlVepOutqN-rula8ECDbH9WoGjS3gAW0F6GzRcgQMBHVVSrsuuzm4vTSgz42YdnRgTid7-oQ",
			e: "AQAB",
			use: "sig",
			kid: "testkey",
			qi: "cg0vF48HyYlb9sBLG17jT8QIBoh5-gbymgXGUjE-r6UEW-7kNgS7-cwR7RfpVk46zFdSOK-mqIPlFIyxX3Npqw17HI9ct0beMdYdZ1RlVCi7YBvL45TGZhMZaJWGlElIq1YiAC9EmQyeCAPIFmM83rf7w5chp_wGhEKGLZyopGM",
			dp: "Q3DlRQDkQuLqpDBTgZRftfaDY_j9D7DeFajUxFkXisFYWlpjSow9tVN4iXiWEiKpDMOlbBquYMVixtmZAQEahk6LilMZMwP6AD-rS1GNYJ4KU0X0e59Efp2F_l_i3TWVhlb-3lc0If7kWjGYgPPFpkN4hmPXNh6sTLXfbb3fwvE",
			alg: "RS256",
			dq: "wdtfQPwn0jXZ5sjfpOPjPT7nMGiK7sfGSyRS6Cd8vLKGIgQZWxBqVhyuxFPia0n8Cp4naApJZHYeGG73F31YIWPab-NvLVOXms1bDIOe1KLnQ3gLssNnvVMNC7YweOj4BPKiZEPo-O34GGQnuqh-t-lZeoxGHFYTutzqNnb2v_s",
			n: "oQoSc74IOh6MN6Cvt5wmnKK0mDYFDCOlfPGn1AryEI22ooBQ634jNDzKhUXIh5fnG1OeKnci5FrYz6g7X-4AoK3DCgR6tdzAkc7LQeG5t68N3DCnBRl6rb-aA9FSEExuvf7k0k2vKk0scGKbjzMKiQnj3cGj5VD1BEUw2bTAn36LrF_BMGdPcdbFQt8NYmABteJadMVvJRNe_g9Swvldf4bjWl-LuW6ky-ulGZIQVGlyEiX9oOsW6V-L1Q3c0dkDAQ3CY4Z-aVxrlYdRUgvsnUkvE4Rs86hhbBAQoIvr1GcwKhzzNxz-zKOdlQ89bjaSJQNdkb9vyy3k-_QPVJ0KZw",
		}),
		"utf-8",
	).toString("base64");

	const cloudflareStreamService = new CloudflareStreamService(
		"dummyAccountId",
		"dummyApiToken",
		"streams.fyp.local",
		jwk,
		keyId,
		logger,
	);

	it("should return a signed token with expected signature", () => {
		const signedToken = cloudflareStreamService.getVideoToken(
			"dummyVideoId",
			12345,
		);
		const expectedSignedToken =
			"eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3RrZXkifQ.eyJzdWIiOiJkdW1teVZpZGVvSWQiLCJraWQiOiJ0ZXN0a2V5IiwiZXhwIjoxMjM0NX0.V32bhEKi0YTMEeJ1qwKW6xIFWGgj9bxQvhyjSNcU48RMrI-oXnHv8z11dJ9MeM-CkWMsM78z0p5HtlCugYkJeWo4Nr5njvO4hqHwp3M9lyewYYQJkPFZMnVJzFaE5QVii19cnq0xO0qPg3qs_PJsDkaf2RPJF6pjjr3KY8uhqX8u3L4Qhroa0K2mu3KnrQyqv6OJI0kvjFMF8BAIw_7esi-FGlWFRzMhNizpFNi0RaE8vta8bgyUCVeVgTta4rtFs9d8UAzBAtrQr47LcK5VO2HvhgQjnZPczmKlafZlUJNINaBF3VD4VNF-AsgjQykqCu_XbFwzrXSOoEc7RGw3DQ";

		assert.equal(signedToken, expectedSignedToken);
	});
});
