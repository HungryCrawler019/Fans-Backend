import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface SubscriptionConfirmationProps {
	fanName: string;
	creatorName: string;
	amount: string;
}

export function SubscriptionConfirmation(props: SubscriptionConfirmationProps) {
	return (
		<FypBaseTemplate>
			<h1>Confirmation of NEW Subscription!</h1>

			<div>Hello {props.fanName},</div>
			<div style={{ marginTop: "20px" }}>
				You've successfully subscribed to {props.creatorName} for $
				{props.amount} per month.
			</div>
			<div style={{ marginTop: "20px" }}>
				To cancel your subscription,{" "}
				<a href="https://fyp.fans/settings?screen=Subscriptions">
					click here
				</a>
				.
			</div>
			<div style={{ marginTop: "20px" }}>
				If you run into any issues or feel that you did not receive what
				was offered by the creator, please contact us at{" "}
				<a href="https://support.fyp.fans/">FYP.Fans Support</a> BEFORE
				charging back or contacting your bank. We guarantee a 100%
				refund within a day if you provide proof of the issue.
			</div>
			<div style={{ marginTop: "30px" }}>
				Best,
				<br />
				The FYP.Fans Team
			</div>
		</FypBaseTemplate>
	);
}
