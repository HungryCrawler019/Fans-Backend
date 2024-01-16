export interface MeetingVacation {
	startDate: string;
	endDate: string;
}

export interface CreateMeetingVacationsBody {
	vacations: MeetingVacation[];
}
