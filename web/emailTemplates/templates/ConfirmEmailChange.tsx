import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface WelcomeTemplateProps {
	verificationLink: string;
	oldEmail: string;
	newEmail: string;
}

export function ConfirmEmailChangeTemplate(props: WelcomeTemplateProps) {
	return (
		<FypBaseTemplate>
			<h1>Please confirm your email address</h1>

			<div>
				You requested to change your email address from {props.oldEmail}{" "}
				to {props.newEmail}. Please confirm this by clicking the button
				below.
				<br />
				If you did not request this change, you can safely ignore this
				email.
			</div>
			<div style={{ marginTop: "30px" }}>
				<a
					href={props.verificationLink}
					target="_blank"
					className="button"
				>
					Confirm Email Address
				</a>
			</div>
		</FypBaseTemplate>
	);
}
