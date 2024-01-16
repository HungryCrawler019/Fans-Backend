export enum BlackWordType {
	none,
	site,
	term,
}

export enum LinkType {
	Custom = "Custom",
}

export enum LinkStyle {
	TextOnly = "TextOnly",
	Thumbnail = "Thumbnail",
	Featured = "Featured",
	ImageGrid = "ImageGrid",
	ImageWithText = "ImageWithText",
}

export enum LinkImageType {
	GIF = "GIF",
	File = "File",
	Icon = "ICON",
}

export enum LinkPrioritize {
	None = "None",
	Animations = "Animations",
	Spotlight = "SpotLight",
}

export enum LinkLockType {
	None = "None",
	Code = "Code",
	Birthday = "Birthday",
	Mark = "Mark",
}

export enum LinkClockType {
	None = "None",
	Schedule = "Schedule",
	CountDown = "CountDown",
	Redirect = "Redirect",
}

export const actions = [
	"Subscribe",
	"Donate",
	"Like",
	"Comment",
	"Share",
	"Purchase",
	"Poll",
] as const;
export type ActionType = (typeof actions)[number];
