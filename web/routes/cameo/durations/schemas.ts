export interface CreateCustomVideoDurationBody {
	length: number;
	price: number;
	currency: string;
	isEnabled?: boolean;
}

export interface UpdateCustomVideoDurationEnabledBody {
	isEnabled: boolean;
}
