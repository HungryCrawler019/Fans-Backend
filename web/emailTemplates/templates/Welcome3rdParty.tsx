import * as React from "react";
import FypBaseTemplate from "../components/FypBaseTemplate.js";

interface Welcome3rdPartyTemplateProps {
	email: string;
	password: string;
}

export function Welcome3rdPartyTemplate(props: Welcome3rdPartyTemplateProps) {
	return (
		<FypBaseTemplate>
			<h1>Welcome to FYP.bio!</h1>

			<div>
				Welcome to FYP.bio! Since you've used a 3rd-party provider for
				signing up, we've prepared a fallback password for you to use in
				case you ever need to log in without it.
			</div>
			<div style={{ marginTop: "30px" }}>
				<b>
					For security reasons, you should change your password as
					soon as possible.
				</b>
			</div>
			<div style={{ marginTop: "30px" }}>
				Your login details are:
				<br />
				<br />
				Email: <code>{props.email}</code>
				<br />
				Password: <code>{props.password}</code>
			</div>
		</FypBaseTemplate>
	);
}
