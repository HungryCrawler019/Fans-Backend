import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface TipConfirmationProps {
	fanName: string;
	creatorName: string;
}

export function TipConfirmation(props: TipConfirmationProps) {
	return (
		<FypBaseTemplate>
			<h1>Tip Confirmation to {props.creatorName}</h1>

			<div>Hello {props.fanName},</div>
			<div style={{ marginTop: "20px" }}>
				Thank you for tipping {props.creatorName}! Your support is
				greatly appreciated.
			</div>
			<div style={{ marginTop: "20px" }}>
				If you encounter any issues, please reach out to us at{" "}
				<a href="https://support.fyp.fans/">FYP.Fans Support</a> for a
				100% refund, provided you give proof of the issue, BEFORE
				contacting your bank or initiating a chargeback.
			</div>
			<div style={{ marginTop: "30px" }}>
				Best,
				<br />
				The FYP.Fans Team
			</div>
		</FypBaseTemplate>
	);
}
