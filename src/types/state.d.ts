export interface State {
	currentPlaylistID?: number,
	publicPlaylistID?: number,
	modePlaylistID?: number,
	playerNeedsRestart?: boolean,
	currentlyPlayingKara?: boolean,
	counterToJingle?: number,
	status?: string,
	private?: boolean,
	fullscreen?: boolean,
	ontop?: boolean,
	playlist?: null,
	timeposition?: 0,
	songPoll?: boolean,
	frontendPort?: number,
	ready?: boolean,
	sessionStart?: Date,
	isDemo?: boolean,
	isTest?: boolean,
	appPath?: string,
	osURL?: string,
	os?: string,
	osHost?: string
	EngineDefaultLocale?: string,
	player?: {
		playing?: boolean,
		fullscreen?: boolean,
		timeposition?: number,
		duration?: number,
		mutestatus?: string,
		playerstatus?: string,
		currentlyPlaying?: boolean,
		subtext?: string,
		showsubs?: boolean,
		volume?: number,
		ready?: boolean
	},
	version?: {
		number?: string,
		name?: string,
		image?: string
	},
	binPath?: {
		mpv?: string,
		ffmpeg?: string,
		postgres?: string,
		postgres_ctl?: string,
		postgres_dump?: string,
	},
	opt?: {
		generateDB?: boolean,
		reset?: boolean,
		noBaseCheck?: boolean,
		strict?: boolean,
		noMedia?: boolean,
		baseUpdate?: boolean,
		noBrowser?: boolean,
		profiling?: boolean,
		sql?: boolean,
		validate?: boolean,
		debug?: boolean,
		forceAdminPassword?: string
	},
	engine?: {
		ontop?: boolean
	}
}

export interface PublicState {
	playing: boolean,
	private: boolean,
	status: string,
	onTop: boolean,
	fullscreen: boolean,
	timePosition: number,
	duration: number,
	muteStatus: string,
	playerStatus: string,
	currentlyPlaying: boolean,
	subText: string,
	showSubs: boolean,
	volume: number,
}
