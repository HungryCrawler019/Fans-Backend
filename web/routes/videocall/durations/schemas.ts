export interface CreateMeetingDurationBody {
	length: number;
	price: number;
	currency: string;
	isEnabled?: boolean;
}

export type UpdateMeetingDurationBody = Partial<CreateMeetingDurationBody>;

export interface UpdateMeetingEnabledBody {
	isEnabled: boolean;
}
