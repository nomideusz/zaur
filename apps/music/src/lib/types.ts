/** The signed-in Zaur account. */
export interface User {
	email: string;
	name: string;
}

/* The slices of Subsonic's JSON the app reads (Navidrome fills more). */

export interface Song {
	id: string;
	title: string;
	artist?: string;
	artistId?: string;
	album?: string;
	albumId?: string;
	coverArt?: string;
	duration?: number;
	track?: number;
	discNumber?: number;
	year?: number;
	starred?: string;
}

export interface Album {
	id: string;
	name: string;
	artist?: string;
	artistId?: string;
	coverArt?: string;
	songCount?: number;
	duration?: number;
	year?: number;
	starred?: string;
	song?: Song[];
}

export interface Artist {
	id: string;
	name: string;
	albumCount?: number;
	coverArt?: string;
	album?: Album[];
}

export interface Playlist {
	id: string;
	name: string;
	songCount?: number;
	duration?: number;
	coverArt?: string;
	owner?: string;
	entry?: Song[];
}

/** One "Add from YouTube" request, as the add page shows it. */
/** A YouTube search hit on the Add page. */
export interface YouTubeResult {
	videoId: string;
	title: string;
	author: string;
	seconds: number;
}

export interface AddJob {
	id: string;
	videoId: string;
	status: 'queued' | 'downloading' | 'done' | 'failed';
	title?: string;
	artist?: string;
	progress?: number;
	error?: string;
	at: number;
}
