import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface ChargebackNoticeToCreatorProps {
	creatorName: string;
	fanName: string;
	transactionAmount: string;
}

export function ChargebackNoticeToCreator(
	props: ChargebackNoticeToCreatorProps,
) {
	return (
		<FypBaseTemplate>
			<h1>Notice of Chargeback from {props.fanName}</h1>

			<div>Dear {props.creatorName},</div>
			<div style={{ marginTop: "20px" }}>
				We regret to inform you that a chargeback has been made by{" "}
				{props.fanName}, and as a result, their account has been debited
				${props.transactionAmount}.
			</div>
			<div style={{ marginTop: "20px" }}>
				Please know that FYP.Fans actively works to prevent chargebacks
				by permanently banning fans who make more than one chargeback.
			</div>
			<div style={{ marginTop: "20px" }}>
				If you have any questions or require further clarification,
				please do not reply to this email. Instead, reach out directly
				to us at <a href="mailto:support@fyp.fans">support@fyp.fans</a>.
			</div>
			<div style={{ marginTop: "30px" }}>
				We apologize for the inconvenience and appreciate your
				understanding.
			</div>
			<div style={{ marginTop: "30px" }}>
				Best regards,
				<br />
				The FYP.Fans Team
			</div>
		</FypBaseTemplate>
	);
}
