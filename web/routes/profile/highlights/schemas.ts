import { IHighlight, IMedia, IStory } from "../../../CommonAPISchemas.js";

export interface HighlightCreateReqBody {
	title: string;
	cover: string;
	stories: string[];
}

export interface HighlightUpdateReqBody {
	title?: string;
	cover?: string;
	stories?: string[];
}

export type HighlightRespBody = IHighlight & {
	stories: IStory[];
};

export interface HighlightsRespBody {
	highlights: HighlightRespBody[];
	page: number;
	size: number;
	total: number;
}
