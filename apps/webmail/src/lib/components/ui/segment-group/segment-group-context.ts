export const SEGMENT_GROUP_CTX = Symbol('segment-group');

export type SegmentGroupVariant = 'default' | 'underline';

export type SegmentGroupContext = {
	value: string | undefined;
	variant: SegmentGroupVariant;
	track: boolean;
	setValue: (value: string) => void;
	registerItem: (el: HTMLElement, value: string) => () => void;
	setIndicatorTarget: (el: HTMLElement | null) => void;
};
