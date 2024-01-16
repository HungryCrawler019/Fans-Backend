import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface TipReceivedProps {
	creatorName: string;
	fanName: string;
}

export function TipReceived(props: TipReceivedProps) {
	return (
		<FypBaseTemplate>
			<h1>You've Received a Tip from {props.fanName}!</h1>

			<div>Dear {props.creatorName},</div>
			<div style={{ marginTop: "20px" }}>
				Cha-Ching! 🎉 You've just received a tip from {props.fanName}.
			</div>
			<div style={{ marginTop: "20px" }}>
				Continue creating wonderful content to inspire and engage your
				fans!
			</div>
			<div style={{ marginTop: "30px" }}>
				Best,
				<br />
				The FYP.Fans Team
			</div>
		</FypBaseTemplate>
	);
}
