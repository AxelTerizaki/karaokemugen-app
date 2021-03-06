
// Karaoke Mugen default configuration file

// this file is overwritten during updates, editing is ill-advised .
// you can change the default settings by using config.yml to bypass the default values.
import { app } from 'electron';

import {bools, hostnameRegexp} from '../lib/utils/constants';
import {Config} from '../types/config';

export const dbConfig = process.platform === 'linux'
	? {
		bundledPostgresBinary: false,
		database: 'karaokemugen_app',
		host: 'localhost',
		password: 'musubi',
		port: 5432,
		superuser: null,
		superuserPassword: null,
		username: 'karaokemugen_app'
	}
	: {
		bundledPostgresBinary: true,
		database: 'karaokemugen_app',
		driver: 'pg',
		host: 'localhost',
		password: 'musubi',
		port: 6559,
		superuser: 'postgres',
		superuserPassword: null,
		username: 'karaokemugen_app'
	};

/** Default configuration */
export const defaults: Config = {
	App: {
		FirstRun: true,
		JwtSecret: 'Change me',
		QuickStart: false
	},
	Online: {
		Host: 'kara.moe',
		MediasHost: null,
		Port: 80,
		Stats: undefined,
		ErrorTracking: undefined,
		Users: true,
		Discord: {
			DisplayActivity: true
		},
		Updates: {
			Medias: {
				Jingles: true,
				Outros: true,
				Encores: true,
				Intros: true,
				Sponsors: true
			},
			App: true,
		},
		Remote: false,
		FetchPopularSongs: true,
		AllowDownloads: true
	},
	Frontend: {
		GeneratePreviews: true,
		AuthExpireTime: 15,
		Mode: 2,
		Port: 1337,
		Permissions: {
			AllowNicknameChange: true
		},
		SeriesLanguageMode: 3,
		ShowAvatarsOnPlaylist: true
	},
	GUI: {
		OpenInElectron: true,
		ChibiPlayer: {
			Enabled: false,
			AlwaysOnTop: true
		},
		ChibiPlaylist: {
			Enabled: false
		}
	},
	Karaoke: {
		Autoplay: false,
		ClassicMode: false,
		SmartInsert: false,
		MinutesBeforeEndOfSessionWarning: 15,
		Display: {
			Avatar: true,
			Nickname: true,
			ConnectionInfo: {
				Enabled: true,
				Host: null,
				Message: ''
			}
		},
		Poll: {
			Choices: 4,
			Enabled: false,
			Timeout: 30
		},
		Quota: {
			FreeAutoTime: 60,
			FreeUpVotes: true,
			FreeUpVotesRequiredMin: 3,
			FreeUpVotesRequiredPercent: 33,
			Songs: 10000,
			Time: 10000,
			Type: 0
		},
		StreamerMode: {
			Enabled: false,
			PauseDuration: 0,
			Twitch: {
				Enabled: false
			}
		}
	},
	Player: {
		Background: '',
		FullScreen: false,
		Monitor: false,
		Borders: true,
		ExtraCommandLine: '',
		mpvVideoOutput: '',
		NoBar: true,
		NoHud: true,
		Screen: 0,
		StayOnTop: true,
		PIP: {
			PositionX: 'Right',
			PositionY: 'Bottom',
			Size: 30,
		},
		ProgressBarDock: true,
		HardwareDecoding: 'auto-safe',
		Volume: 100
	},
	Playlist: {
		AllowDuplicates: false,
		MaxDejaVuTime: 60,
		Medias: {
			Sponsors: {
				Enabled: true,
				Interval: 50
			},
			Jingles: {
				Enabled: true,
				Interval: 20
			},
			Intros: {
				Enabled: true,
				File: null,
				Message: null
			},
			Encores: {
				Enabled: true,
				File: null,
				Message: null
			},
			Outros: {
				Enabled: true,
				File: null,
				Message: null
			}
		},
		MysterySongs: {
			AddedSongVisibilityAdmin: true,
			AddedSongVisibilityPublic: true,
			Hide: false,
			Labels: [
				'???',
			]
		},
		EndOfPlaylistAction: 'none',
		RandomSongsAfterEndMessage: true,
	},
	System: {
		Database: dbConfig,
		Binaries: {
			Player: {
				Linux: '/usr/bin/mpv',
				OSX: app?.isPackaged
					? 'Karaoke Mugen.app/Contents/app/bin/mpv.app/Contents/MacOS/mpv'
					: 'app/bin/mpv.app/Contents/MacOS/mpv',
				Windows: 'app\\bin\\mpv.exe'
			},
			ffmpeg: {
				Linux: '/usr/bin/ffmpeg',
				OSX: app?.isPackaged
					? 'Karaoke Mugen.app/Contents/app/bin/ffmpeg'
					: 'app/bin/ffmpeg',
				Windows: 'app\\bin\\ffmpeg.exe'
			},
			Postgres: {
				Linux: 'app/bin/postgres/bin/',
				OSX: app?.isPackaged
					? 'Karaoke Mugen.app/Contents/app/bin/postgres/bin/'
					: 'app/bin/postgres/bin/',
				Windows: 'app\\bin\\postgres\\bin\\'
			},
			patch: {
				Linux: '/usr/bin/patch',
				OSX: app?.isPackaged
					? 'Karaoke Mugen.app/Contents/app/bin/patch'
					: 'app/bin/patch',
				Windows: 'app\\bin\\patch.exe'
			}
		},
		Repositories: [
			{
				Name: 'kara.moe',
				Online: true,
				Enabled: true,
				SendStats: true,
				AutoMediaDownloads: 'updateOnly',
				MaintainerMode: false,
				BaseDir: process.platform === 'win32' ? 'repos\\kara.moe\\json' : 'repos/kara.moe/json',
				Path: process.platform === 'win32'
					? {
						Medias: ['repos\\kara.moe\\medias']
					}
					: {
						Medias: ['repos/kara.moe/medias']
					}
			},
			{
				Name: 'Local',
				Online: false,
				Enabled: true,
				BaseDir: process.platform === 'win32' ? 'repos\\Local\\json' : 'repos/Local/json',
				Path: process.platform === 'win32'
					? {
						Medias: ['repos\\Local\\medias'],
					}
					: {
						Medias: ['repos/Local/medias'],
					}
			}
		],
		Path: {
			Avatars: 'avatars',
			Backgrounds: ['backgrounds'],
			Bin: 'bin',
			DB: 'db',
			Encores: process.platform === 'win32' ? ['encores', 'encores\\KaraokeMugen'] : ['encores', 'encores/KaraokeMugen'],
			Import: 'import',
			Intros: process.platform === 'win32' ? ['intros', 'intros\\KaraokeMugen'] : ['intros', 'intros/KaraokeMugen'],
			Jingles: process.platform === 'win32' ? ['jingles', 'jingles\\KaraokeMugen'] : ['jingles', 'jingles/KaraokeMugen'],
			Outros: process.platform === 'win32' ? ['outros', 'outros\\KaraokeMugen'] : ['outros', 'outros/KaraokeMugen'],
			Sponsors: process.platform === 'win32' ? ['sponsors', 'sponsors\\KaraokeMugen'] : ['sponsors', 'sponsors/KaraokeMugen'],
			Temp: 'temp',
			Previews: 'previews',
			SessionExports: 'sessionExports',
			StreamFiles: 'streamFiles'
		}
	}
};

const horizontalPosArray = ['Left', 'Right', 'Center'];
const verticalPosArray = ['Top', 'Bottom', 'Center'];
const hwdecModes = ['auto-safe', 'no', 'yes'];
const endOfPlaylistActions = ['random', 'repeat', 'none'];

/** Config constraints. */
export const configConstraints = {
	'App.FirstRun': {inclusion : bools},
	'App.QuickStart': {inclusion : bools},
	// 'App.InstanceID': {presence: true, format: new RegExp(uuidRegexp)}, // Broken on regular installations since InstanceID is stored in database
	'Online.Stats': {boolUndefinedValidator: true},
	'Online.ErrorTracking': {boolUndefinedValidator: true},
	'Online.Host': {presence: true, format: hostnameRegexp},
	'Online.Port': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	'Online.Users': {inclusion : bools},
	'Online.Discord.DisplayActivity': {inclusion: bools},
	'Online.Updates.Medias.Jingles': {inclusion : bools},
	'Online.Updates.Medias.Outros': {inclusion : bools},
	'Online.Updates.Medias.Encores': {inclusion : bools},
	'Online.Updates.Medias.Intros': {inclusion : bools},
	'Online.Updates.App': {inclusion : bools},
	'Frontend.Permissions.AllowNicknameChange': {inclusion : bools},
	'Frontend.AuthExpireTime': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Frontend.Mode': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 2}},
	'Frontend.Port': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	'Frontend.SeriesLanguageMode': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 3}},
	'Frontend.ShowAvatarsOnPlaylist': {inclusion: bools},
	'GUI.OpenInElectron': {inclusion: bools},
	'Karaoke.Autoplay': {inclusion : bools},
	'Karaoke.ClassicMode': {inclusion : bools},
	'Karaoke.MinutesBeforeEndOfSessionWarning': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	'Karaoke.StreamerMode.Enabled': {inclusion: bools},
	'Karaoke.StreamerMode.PauseDuration': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	'Karaoke.StreamerMode.Twitch.Enabled': {inclusion: bools},
	'Karaoke.SmartInsert': {inclusion : bools},
	'Karaoke.Poll.Choices': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Karaoke.Poll.Timeout': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Karaoke.Poll.Enabled': {inclusion : bools},
	'Karaoke.Quota.Type': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 2}},
	'Karaoke.Quota.FreeUpVotes': {inclusion : bools},
	'Karaoke.Quota.FreeAutoTime': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Karaoke.Quota.FreeUpVotesRequiredMin': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Karaoke.Quota.FreeUpVotesRequiredPercent': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1, lowerThanOrEqualTo: 100}},
	'Karaoke.Quota.Songs': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Karaoke.Quota.Time': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Karaoke.Display.Avatar': {inclusion : bools},
	'Karaoke.Display.Nickname': {inclusion : bools},
	'Karaoke.Display.ConnectionInfo.Enabled': {inclusion : bools},
	'Karaoke.Display.ConnectionInfo.Message': {presence: {allowEmpty: true}},
	'Player.FullScreen': {inclusion : bools},
	'Player.Monitor': {inclusion : bools},
	'Player.NoBar': {inclusion : bools},
	'Player.NoHud': {inclusion : bools},
	'Player.StayOnTop': {inclusion : bools},
	'Player.Screen': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	'Player.PIP.PositionX': {inclusion : horizontalPosArray},
	'Player.PIP.PositionY': {inclusion : verticalPosArray},
	'Player.PIP.Size': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 100}},
	'Player.ProgressBarDock': {inclusion : bools},
	'Player.Volume': {numericality: {greaterThanOrEqualTo: 0, lessThanOrEqualTo: 100}},
	'Player.HardwareDecoding': {inclusion: hwdecModes},
	'Playlist.AllowDuplicates': {inclusion : bools},
	'Playlist.MaxDejaVuTime': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Playlist.Medias.Intros.Enabled': {inclusion: bools},
	'Playlist.Medias.Sponsors.Enabled': {inclusion: bools},
	'Playlist.Medias.Sponsors.Interval': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Playlist.Medias.Outros.Enabled': {inclusion: bools},
	'Playlist.Medias.Encores.Enabled': {inclusion: bools},
	'Playlist.Medias.Jingles.Enabled': {inclusion: bools},
	'Playlist.Medias.Jingles.Interval': {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	'Playlist.MysterySongs.Hide': {inclusion: bools},
	'Playlist.MysterySongs.AddedSongVisibilityAdmin': {inclusion: bools},
	'Playlist.MysterySongs.AddedSongVisibilityPublic': {inclusion: bools},
	'Playlist.MysterySongs.Labels': {arrayOneItemValidator: true},
	'Playlist.EndOfPlaylistAction': {inclusion: endOfPlaylistActions},
	'Playlist.RandomSongsAfterEndMessage': {inclusion: bools},
	'System.Binaries.Player.Linux': {presence: true},
	'System.Binaries.Player.Windows': {presence: true},
	'System.Binaries.Player.OSX': {presence: true},
	'System.Binaries.ffmpeg.Linux': {presence: true},
	'System.Binaries.ffmpeg.Windows': {presence: true},
	'System.Binaries.ffmpeg.OSX': {presence: true},
	'System.Binaries.Postgres.Linux': {presence: true},
	'System.Binaries.Postgres.Windows': {presence: true},
	'System.Binaries.Postgres.OSX': {presence: true},
	'System.Path.Avatars': {presence: true},
	'System.Path.Backgrounds': {arrayOneItemValidator: true},
	'System.Path.Bin': {presence: true},
	'System.Path.DB': {presence: true},
	'System.Path.Encores': {arrayOneItemValidator: true},
	'System.Path.Jingles': {arrayOneItemValidator: true},
	'System.Path.Intros': {arrayOneItemValidator: true},
	'System.Path.Sponsors': {arrayOneItemValidator: true},
	'System.Path.Outros': {arrayOneItemValidator: true},
	'System.Path.Temp': {presence: true},
	'System.Path.Previews': {presence: true},
	'System.Path.Import': {presence: true},
	'System.Repositories': {repositoriesValidator: true}
};
