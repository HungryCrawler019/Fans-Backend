import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface NewSubscriptionAlertProps {
	creatorName: string;
	fanName: string;
}

export function NewSubscriptionAlert(props: NewSubscriptionAlertProps) {
	return (
		<FypBaseTemplate>
			<h1>Cha-Ching, New Subscription Alert!</h1>

			<div>Dear {props.creatorName},</div>
			<div style={{ marginTop: "20px" }}>
				Cha-Ching! 🎉 {props.fanName} has just subscribed to your
				content!
			</div>
			<div style={{ marginTop: "20px" }}>
				Welcome your new fan and keep creating amazing content to keep
				your audience engaged.
			</div>
			<div style={{ marginTop: "30px" }}>
				Best,
				<br />
				The FYP.Fans Team
			</div>
		</FypBaseTemplate>
	);
}
