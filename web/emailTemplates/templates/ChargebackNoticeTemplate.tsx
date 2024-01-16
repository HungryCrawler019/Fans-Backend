import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface ChargebackNoticeTemplateProps {
	fanName: string;
}

export function ChargebackNoticeTemplate(props: ChargebackNoticeTemplateProps) {
	return (
		<FypBaseTemplate>
			<h1>Important Notice Regarding Your Recent Chargeback</h1>

			<div>Dear {props.fanName},</div>
			<div style={{ marginTop: "20px" }}>
				We noticed that a chargeback has been made on your account. We
				want to inform you that FYP.Fans does not allow chargebacks.
				<b>IMPORTANT:</b> If you feel that you were cheated by a creator
				or did not receive the content as promised, please reach out to
				us at <a href="https://support.fyp.fans/">FYP.Fans Support</a>{" "}
				for a 100% refund with no consequences.
			</div>
			<div style={{ marginTop: "20px" }}>
				Please be aware that if another chargeback is made from your
				account, your account and IP address will be permanently banned
				from FYP.Fans.
			</div>
			<div style={{ marginTop: "20px" }}>
				If you have any questions or need further assistance, please do
				not reply to this email. Instead, contact us directly at{" "}
				<a href="mailto:support@fyp.fans">support@fyp.fans</a>.
			</div>
			<div style={{ marginTop: "30px" }}>
				Best regards,
				<br />
				The FYP.Fans Team
			</div>
		</FypBaseTemplate>
	);
}
