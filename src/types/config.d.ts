import { Repository } from '../lib/types/repo';
import { MpvHardwareDecodingOptions } from './MpvIPC';

export interface Config {
	App: {
		JwtSecret?: string,
		InstanceID?: string,
		FirstRun?: boolean,
		QuickStart?: boolean
	},
	Online: {
		Host?: string,
		Port?: number,
		Users?: boolean,
		Stats?: boolean,
		ErrorTracking?: boolean,
		Discord?: {
			DisplayActivity?: boolean
		}
		Updates?: {
			Medias?: {
				Jingles?: boolean,
				Intros?: boolean,
				Outros?: boolean,
				Encores?: boolean,
				Sponsors?: boolean
			}
			App?: boolean
		}
		MediasHost?: string,
		Remote?: boolean,
		FetchPopularSongs?: boolean,
		AllowDownloads?: boolean
	},
	Frontend: {
		GeneratePreviews?: boolean,
		Port?: number,
		Mode?: number,
		SeriesLanguageMode: number,
		AuthExpireTime?: number,
		Permissions?: {
			AllowNicknameChange?: boolean
		},
		ShowAvatarsOnPlaylist?: boolean
	},
	Gitlab?: {
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
	},
	GUI: {
		OpenInElectron?: boolean,
		ChibiPlayer?: {
			Enabled?: boolean,
			AlwaysOnTop?: boolean,
			PositionX?: number,
			PositionY?: number,
		},
		ChibiPlaylist?: {
			Enabled?: boolean,
			PositionX?: number,
			PositionY?: number,
		}
	}
	Karaoke: {
		ClassicMode?: boolean,
		StreamerMode: {
			Enabled?: boolean,
			PauseDuration?: number
			Twitch: {
				Enabled?: boolean,
				OAuth?: string,
				Channel?: string
			}
		}
		MinutesBeforeEndOfSessionWarning?: number,
		Autoplay?: boolean,
		SmartInsert?: boolean,
		AutoBalance?: boolean,
		Display: {
			Avatar?: boolean,
			Nickname?: boolean,
			ConnectionInfo?: {
				Enabled?: boolean,
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
		Monitor?: boolean,
		NoHud?: boolean,
		NoBar?: boolean,
		mpvVideoOutput?: string,
		PIP: {
			Size?: number,
			PositionX?: 'Left' | 'Right' | 'Center',
			PositionY?: 'Top' | 'Bottom' | 'Center'
		},
		ProgressBarDock?: boolean,
		ExtraCommandLine?: string,
		Borders?: boolean,
		HardwareDecoding?: MpvHardwareDecodingOptions
		Volume?: number
	},
	Playlist: {
		AllowDuplicates?: boolean,
		MaxDejaVuTime?: number,
		Medias: {
			Jingles: {
				Enabled: boolean,
				Interval: number,
			},
			Sponsors: {
				Enabled: boolean,
				Interval: number,
			}
			Intros: {
				Enabled: boolean,
				File: string,
				Message?: string
			}
			Outros: {
				Enabled: boolean,
				File: string,
				Message?: string
			},
			Encores: {
				Enabled: boolean,
				File: string,
				Message?: string
			}
		}
		MysterySongs: {
			Hide?: boolean,
			AddedSongVisibilityPublic?: boolean,
			AddedSongVisibilityAdmin?: boolean,
			Labels?: string[]
		},
		EndOfPlaylistAction: 'random' | 'repeat' | 'none',
		RandomSongsAfterEndMessage: boolean
	},
	System: {
		Database: {
			host?: string,
			port?: number,
			username?: string,
			password?: string,
			superuser?: string,
			superuserPassword?: string,
			database?: string,
			bundledPostgresBinary?: boolean
		},
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
			},
			patch: {
				Windows?: string,
				OSX?: string,
				Linux?: string
			}
		},
		Repositories: Repository[]
		Path: {
			Bin?: string,
			DB?: string,
			Backgrounds?: string[],
			Jingles?: string[],
			Intros?: string[],
			Outros?: string[],
			Encores?: string[],
			Sponsors?: string[],
			Temp?: string,
			Previews?: string,
			SessionExports?: string,
			Import?: string,
			Avatars?: string,
			StreamFiles?: string
		}
	}
}
