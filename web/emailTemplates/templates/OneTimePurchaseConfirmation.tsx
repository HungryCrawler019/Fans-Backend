import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface OneTimePurchaseConfirmationProps {
	fanName: string;
	postUrl: string;
}

export function OneTimePurchaseConfirmation(
	props: OneTimePurchaseConfirmationProps,
) {
	return (
		<FypBaseTemplate>
			<h1>One-Time Purchase Confirmation</h1>

			<div>Hello {props.fanName},</div>
			<div style={{ marginTop: "20px" }}>
				You've successfully purchased the following post:{" "}
				<a href={props.postUrl}>View Post</a>.
			</div>
			<div style={{ marginTop: "20px" }}>
				If you face any issues or feel that you didn’t receive what was
				promised by the creator, please contact us at{" "}
				<a href="https://support.fyp.fans/">FYP.Fans Support</a> BEFORE
				initiating a chargeback or contacting your bank. Providing proof
				of the issue will ensure a 100% refund within a day.
			</div>
			<div style={{ marginTop: "30px" }}>
				Best,
				<br />
				The FYP.Fans Team
			</div>
		</FypBaseTemplate>
	);
}
