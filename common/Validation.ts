export const usernameRegex = /^[a-zA-Z0-9_.-]{3,32}$/;

export const emailRegex =
	/^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/; // eslint-disable-line no-control-regex

const reservedUserNames = new Set<string>([
	"about",
	"admin",
	"api",
	"blog",
	"bookmark",
	"bookmarks",
	"bundle",
	"cdncgi",
	"cdn",
	"cdns",
	"cgi",
	"cgibin",
	"claim",
	"chat",
	"checkout",
	"checkyouremail",
	"contentcheckout",
	"create",
	"createpost",
	"createnewpassword",
	"developer",
	"developers",
	"discordscom",
	"embeds",
	"explore",
	"faq",
	"fypbio",
	"fypfans",
	"gems",
	"getgems",
	"index",
	"invitations",
	"invite",
	"help",
	"helpcenter",
	"home",
	"homepage",
	"host",
	"layout",
	"logo",
	"login",
	"logout",
	"menu",
	"monetization",
	"monetize",
	"next",
	"notification",
	"notifications",
	"null",
	"oauth2",
	"playlist",
	"playlists",
	"post",
	"posts",
	"premiumpopup",
	"premium",
	"privacy",
	"privacypolicy",
	"products",
	"profile",
	"profiles",
	"public",
	"purchasedashboard",
	"refer",
	"register",
	"report",
	"reports",
	"resetpassword",
	"search",
	"setting",
	"settings",
	"signup",
	"stories",
	"story",
	"success",
	"support",
	"terms",
	"test",
	"undefined",
	"username",
	"verify",
	"verifyaccount",
	"welcome",
	"www",
	"wwwblog",
]);

export function isUsernameValid(username: string): boolean {
	if (reservedUserNames.has(username.toLowerCase().replace(/-\._/g, ""))) {
		return false;
	}

	return usernameRegex.test(username);
}

export function isEmailValid(email: string): boolean {
	return emailRegex.test(email);
}

export function nonNaN(
	value: number | string | null | undefined,
): number | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	value = Number(value);
	return isNaN(value) ? undefined : value;
}

export function isTrueString(value?: string): boolean {
	if (!value) return false;
	value = value.toLowerCase();
	return value === "true" || value === "1" || value == "yes";
}
