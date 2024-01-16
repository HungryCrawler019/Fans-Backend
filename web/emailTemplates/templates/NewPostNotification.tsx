import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface NewPostNotificationProps {
	recipientName: string;
	creatorName: string;
	postLink: string;
}

export function NewPostNotification(props: NewPostNotificationProps) {
	return (
		<FypBaseTemplate>
			<h1>New Post Alert!</h1>

			<div>Hello {props.recipientName},</div>
			<div style={{ marginTop: "20px" }}>
				Exciting news! <strong>{props.creatorName}</strong> has just
				posted something new which is linked below:
			</div>
			<div style={{ marginTop: "20px", fontWeight: "bold" }}>
				<a href={props.postLink}>Click here to see the post</a>
			</div>
			<div style={{ marginTop: "20px" }}>
				Remember, you're receiving this email because you are subscribed
				to <strong>{props.creatorName}</strong> on fyp.fans.
			</div>
			<div style={{ marginTop: "20px" }}>
				Want to adjust your notification preferences? No problem!
				<a href="https://fyp.fans/settings?screen=Notifications">
					Manage your settings here.
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
