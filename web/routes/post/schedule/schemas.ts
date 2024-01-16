import { ISchedule } from "../../../CommonAPISchemas.js";

export interface ScheduleUpdateReqBody {
	startDate?: string;
	endDate?: string;
}

export type ScheduleRespBody = ISchedule;
