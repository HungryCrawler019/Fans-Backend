import { Html } from "@react-email/html";
import * as React from "react";
import { stylesheet } from "./stylesheet.js";

export interface FypBaseTemplateProps {
	children?: React.ReactNode;
}

export function FypBaseTemplate(props: FypBaseTemplateProps) {
	return (
		<Html lang="en">
			<head>
				<style>{stylesheet}</style>
				{/* <meta name="color-scheme" content="light dark" />
				<meta name="supported-color-schemes" content="light dark" /> */}
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1.0"
				/>
				<meta name="charset" content="UTF-8" />
			</head>
			<body>
				<div className="container">
					<div className="header">
						<img
							src="https://cdn.fyp.fans/misc/fyp-fans-logo-email.png"
							alt="FYP.bio"
						/>
					</div>
					<div className="content">{props.children}</div>

					<div className="footer">
						© {new Date().getFullYear()} Harvest Angels LLC.
						{" | "}
						<a href="https://fyp.fans/terms">Terms of Service</a>
						{" | "}
						<a href="https://app.termly.io/document/privacy-policy/8234c269-74cc-48b6-9adb-be080aaaee11">
							Privacy Policy
						</a>
					</div>
				</div>
			</body>
		</Html>
	);
}

export default FypBaseTemplate;
