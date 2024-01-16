import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface WelcomeTemplateProps {
	verificationLink: string;
}

export function WelcomeTemplate(props: WelcomeTemplateProps) {
	return (
		<FypBaseTemplate>
			<h1>Welcome to FYP.bio!</h1>

			<div>
				Please click the link below to verify your email address and
				start using FYP.bio.
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
