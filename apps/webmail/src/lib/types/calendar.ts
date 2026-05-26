export interface Calendar {
	id: string;
	name: string;
	color: string;
	isDefault: boolean;
	isVisible: boolean;
}

export interface CalendarEvent {
	id: string;
	calendarIds: string[];
	title: string;
	description?: string;
	start: Date;
	end: Date;
	allDay: boolean;
	location?: string;
}
