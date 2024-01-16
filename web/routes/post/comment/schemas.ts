import {
	IComment,
	IPost,
	IProfile,
	IReply,
	IUser,
} from "../../../CommonAPISchemas.js";

export interface CommentCreateReqBody {
	postId: string;
	parentCommentId?: string;
	content: string;
}

export interface CommentUpdateReqBody {
	content: string;
}

export interface CommentReportReqBody {
	reason?: string;
}

export type CommentRespBody = IComment & {
	post?: IPost;
	parentComment?: IComment;
	user?: IUser & { profile?: IProfile };
};

export interface RepliesRespBody {
	replies: IReply[];
}
