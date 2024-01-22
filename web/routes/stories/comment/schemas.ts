import { IComment, IStory, IStoryReply } from "../../../CommonAPISchemas.js";

export interface StoryCommentCreateReqBody {
	storyId: string;
	parentCommentId?: string;
	content: string;
}

export interface StoryCommentUpdateReqBody {
	content: string;
}

export interface StoryCommentRespBody extends IComment {
	story: IStory;
	parentComment?: IComment;
}

export interface StoryRepliesRespBody {
	replies: IStoryReply[];
}
