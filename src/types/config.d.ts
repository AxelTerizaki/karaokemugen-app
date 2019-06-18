export interface Config {
	App: {
		JwtSecret?: string,
		InstanceID?: string,
		FirstRun?: boolean,
		karaSuggestionMail?: string
	},
	Online: {
		Host?: string,
		Port?: number,
		Users?: boolean,
		URL?: boolean,
		Stats?: boolean
	},
	Frontend: {
		Port?: number,
		Mode?: number,
		SeriesLanguageMode?: number,
		AuthExpireTime?: number,
		Permissions?: {
			AllowNicknameChange?: boolean,
			AllowViewWhitelist?: boolean,
			AllowViewBlacklist?: boolean,
			AllowViewBlacklistCriterias?: boolean
		}
	},
	Gitlab: {
		Enabled?: boolean,
		Host?: string,
		Token?: string,
		ProjectID?: number,
		IssueTemplate?: {
			Suggestion?: {
				Description?: string,
				Title?: string,
				Labels?: string[]
			}
		}
	}
	Karaoke: {
		Private?: boolean,
		Autoplay?: boolean,
		Repeat?: boolean,
		SmartInsert?: boolean,
		CreatePreviews?: boolean,
		JinglesInterval?: number,
		Display: {
			Avatar?: boolean,
			Nickname?: boolean,
			ConnectionInfo?: {
				Enabled?: boolean,
				QRCode?: boolean,
				Host?: string,
				Message?: string
			}
		},
		Poll: {
			Enabled?: boolean,
			Choices?: number,
			Timeout?: number
		},
		Quota: {
			Songs?: number,
			Time?: number,
			Type?: number,
			FreeAutoTime?: number,
			FreeUpVotes?: boolean,
			FreeUpVotesRequiredPercent?: number,
			FreeUpVotesRequiredMin?: number
		}
	},
	Player: {
		StayOnTop?: boolean,
		FullScreen?: boolean,
		Background?: string,
		Screen?: number,
		VisualizationEffects?: boolean,
		Monitor?: boolean,
		NoHud?: boolean,
		NoBar?: boolean,
		mpvVideoOutput?: string,
		PIP: {
			Enabled?: boolean,
			Size?: number,
			PositionX?: PositionX,
			PositionY?: PositionY
		}
	},
	Playlist: {
		AllowDuplicates?: boolean,
		MaxDejaVuTime?: number,
		RemovePublicOnPlay?: boolean
	},
	System: {
		Binaries: {
			Player: {
				Windows?: string,
				OSX?: string,
				Linux?: string
			},
			Postgres: {
				Windows?: string,
				OSX?: string,
				Linux?: string
			},
			ffmpeg: {
				Windows?: string,
				OSX?: string,
				Linux?: string
			}
		},
		Path: {
			Bin?: string,
			Karas?: string[],
			Medias?: string[],
			Lyrics?: string[],
			DB?: string,
			Series?: string[],
			Backgrounds?: string[],
			Jingles?: string[],
			Temp?: string,
			Previews?: string,
			Import?: string,
			Avatars?: string,
			MediasHTTP?: string
		}
	},
	Database: {
		'sql-file'?: boolean,
		defaultEnv?: string,
		prod: {
			driver?: string,
			host?: string,
			port?: number,
			user?: string,
			password?: string,
			superuser?: string,
			superuserPassword?: string,
			schema?: string,
			database?: string,
			bundledPostgresBinary?: boolean
		}
	}
}

export type PositionX = 'Left' | 'Right' | 'Center';
export type PositionY = 'Top' | 'Bottom' | 'Center';
