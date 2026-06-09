export const ACTION_BAR_CTX = Symbol('action-bar');

export type ActionBarPlacement = 'bottom' | 'bottom-start' | 'bottom-end';
export type ActionBarMode = 'floating' | 'inline';

export type ActionBarPositioning = {
	gutter?: string;
	placement?: ActionBarPlacement;
	/** `floating` portals to the viewport; `inline` renders in document flow below the anchor content. */
	mode?: ActionBarMode;
};

export type ActionBarContext = {
	isOpen: boolean;
	lazyMount: boolean;
	unmountOnExit: boolean;
	positioning: Required<Pick<ActionBarPositioning, 'gutter' | 'placement'>> & {
		mode: ActionBarMode;
	};
	onClose: () => void;
	onOpen: () => void;
};
