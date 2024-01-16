import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface MessageNotificationProps {
	recipientName: string;
	senderName: string;
	messagePreview: string;
}

export function MessageNotification(props: MessageNotificationProps) {
	return (
		<FypBaseTemplate>
			<h1>You've Got a New Message!</h1>

			<div>Hey {props.recipientName},</div>
			<div style={{ marginTop: "20px" }}>
				You've got mail! <strong>{props.senderName}</strong> has sent
				you a message on fyp.fans. Here's a snippet of what they said:
			</div>
			<div
				style={{
					marginTop: "20px",
					fontStyle: "italic",
					borderLeft: "3px solid #eee",
					paddingLeft: "15px",
				}}
			>
				"{props.messagePreview}"
			</div>
			<div style={{ marginTop: "20px" }}>
				<a href="https://fyp.fans/messages?screen=Inbox">
					Read the full message now!
				</a>
			</div>
			<div style={{ marginTop: "20px" }}>
				If you'd like to adjust how often you hear from us, you can
				<a href="https://fyp.fans/settings?screen=Notifications">
					{" "}
					update your preferences here.
				</a>
			</div>
			<div style={{ marginTop: "30px" }}>
				Cheers,
				<br />
				The fyp.fans Team
			</div>
		</FypBaseTemplate>
	);
}
