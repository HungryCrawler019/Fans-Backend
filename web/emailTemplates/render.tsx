import { render } from "@react-email/render";
import * as React from "react";

export function renderToHTML<P>(
	Component: React.ComponentType<P>,
	props: P & JSX.IntrinsicAttributes,
): string {
	const html = render(<Component {...props} />, {});

	return html;
}
