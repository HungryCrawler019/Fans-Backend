import {
	IComment,
	IPost,
	IReply,
	IStory,
	IStoryComment,
	IStoryReply,
} from "../../../CommonAPISchemas.js";

export interface StoryCommentCreateReqBody {
	storyId: string;
	parentCommentId?: string;
	content: string;
}

export interface StoryCommentUpdateReqBody {
	content: string;
}

export type StoryCommentRespBody = IStoryComment & {
	story: IStory;
	parentComment?: IStoryComment;
};

export interface StoryRepliesRespBody {
	replies: IStoryReply[];
}
