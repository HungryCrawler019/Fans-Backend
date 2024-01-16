import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface OneTimePurchaseAlertProps {
	creatorName: string;
	fanName: string;
	postUrl: string;
	totalAmount: string;
}

export function OneTimePurchaseAlert(props: OneTimePurchaseAlertProps) {
	return (
		<FypBaseTemplate>
			<h1>Cha-Ching One-Time Purchase Alert!</h1>

			<div>Dear {props.creatorName},</div>
			<div style={{ marginTop: "20px" }}>
				Good news! {props.fanName} has made a one-time purchase of your
				post: <a href={props.postUrl}>Post Link</a>. The total earnings
				from this paid post are now ${props.totalAmount}.
			</div>
			<div style={{ marginTop: "20px" }}>Keep up the fantastic work!</div>
			<div style={{ marginTop: "30px" }}>
				Best,
				<br />
				The FYP.Fans Team
			</div>
		</FypBaseTemplate>
	);
}
