export interface PlayerState {
	volume?: number,
	playing?: boolean,
	playerstatus?: 'stop' | 'pause' | 'play',
	_playing?: boolean, // internal delay flag
	timeposition?: number,
	duration?: number,
	mutestatus?: boolean,
	subtext?: string,
	currentSongInfos?: string,
	mediaType?: 'song' | 'background' | 'Jingles' | 'Sponsors' | 'Encores' | 'Outros' | 'Intros',
	showsubs?: boolean,
	stayontop?: boolean,
	fullscreen?: boolean,
	url?: string,
	status?: string
}

export interface mpvStatus {
	property: string,
	value: any
}
export interface playerStatus {
	'sub-text': string,
	volume: number,
	duration: number,
	'playtime-remaining': number,
	'eof-reached': boolean,
	mute: boolean,
	pause: boolean,
	filename: string,
	path: string,
	'media-title': string,
	'playlist-pos': number,
	'playlist-count': number,
	loop: string,
	fullscreen: boolean
}

export interface MediaData {
	media: string,
	subfile: string,
	gain: number,
	infos: string,
	avatar: string,
	duration: number,
	repo: string
	spoiler: boolean
}