// Karaoke Mugen default configuration file

// this file is overwritten during updates, editing is ill-advised .
// you can change the default settings by using config.ini to bypass the default value .
export const defaults = {
	JwtSecret: 'Change me',
	EngineDisplayNickname: 1,
	EngineDisplayConnectionInfo: 1,
	EngineDisplayConnectionInfoQRCode: 1,
	EngineDisplayConnectionInfoMessage: '',
	EngineDisplayConnectionInfoHost: '',
	EnginePrivateMode: 1,
	EngineAllowViewWhitelist: 1,
	EngineAllowViewBlacklist: 1,
	EngineAllowViewBlacklistCriterias: 1,
	EngineSongsPerUser: 10000,
	EngineTimePerUser: 240,
	EngineQuotaType: 1,
	EngineFreeAutoTime: 60,
	EngineFreeUpvotes: 1,
	EngineFreeUpvotesRequiredPercent: 33,
	EngineFreeUpvotesRequiredMin: 4,
	EngineAutoPlay: 0,
	EngineRepeatPlaylist: 0,
	EngineMaxDejaVuTime: 60,
	EngineSmartInsert: 0,
	EngineJinglesInterval: 20,
	EngineCreatePreviews: 0,
	EngineSongPoll: 0,
	EngineSongPollChoices: 4,
	EngineSongPollTimeout: 30,
	EngineRemovePublicOnPlay: 1,
	PlayerBackground: '',
	PlayerScreen: 0,
	PlayerFullscreen: 0,
	PlayerStayOnTop: 1,
	PlayerMonitor: 0,
	PlayerNoHud: 1,
	PlayerNoBar: 1,
	PlayerPIP: 1,
	PlayerPIPSize: 35,
	PlayerPIPPositionX: 'Right',
	PlayerPIPPositionY: 'Bottom',
	BinPlayerWindows: 'app/bin/mpv.exe',
	BinPlayerOSX: 'app/bin/mpv.app/Contents/MacOS/mpv',
	BinPlayerLinux: '/usr/bin/mpv',
	BinffmpegWindows: 'app/bin/ffmpeg.exe',
	BinffmpegLinux: '/usr/bin/ffmpeg',
	BinffmpegOSX: 'app/bin/ffmpeg',
	BincurlWindows: 'app/bin/curl.exe',
	BincurlLinux: '/usr/bin/curl',
	BincurlOSX: '/usr/bin/curl',
	PathBin: 'app/bin',
	PathKaras: 'app/data/karas',
	PathMedias: 'app/data/medias',
	PathSubs: 'app/data/lyrics',
	PathDB: 'app/db',
	PathDBKarasFile: 'karas.sqlite3',
	PathDBUserFile: 'userdata.sqlite3',
	PathAltname: 'app/data/series.json',
	PathBackgrounds: 'app/backgrounds',
	PathJingles: 'app/jingles',
	PathTemp: 'app/temp',
	PathPreviews: 'app/previews',
	PathImport: 'app/import',
	PathAvatars: 'app/avatars',
	PathMediasHTTP: '',
	mpvVideoOutput: '',
	AuthExpireTime: 15,
	WebappMode: 2,
	WebappSongLanguageMode: 2,
	OnlineMode: 0,
	OnlineHost: 'kara.moe',
	OnlinePort: 80,
	appInstanceID: 'Change me',
	appFrontendPort: 1337,
	appAdminPort: 1338,
	appFirstRun: 1,
};

const horizontalPosArray = ['Left', 'Right', 'Center'];
const verticalPosArray = ['Top', 'Bottom', 'Center'];

export const configConstraints = {
	EngineDisplayNickname: {boolIntValidator: true},
	EngineDisplayConnectionInfo: {boolIntValidator: true},
	EngineDisplayConnectionInfoQRCode: {boolIntValidator: true},
	EnginePrivateMode: {boolIntValidator: true},
	EngineAllowViewWhitelist: {boolIntValidator: true},
	EngineAllowViewBlacklist: {boolIntValidator: true},
	EngineAllowViewBlacklistCriterias: {boolIntValidator: true},
	EngineSongsPerUser: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	EngineTimePerUser: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	EngineQuotaType: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	OnlineMode: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	OnlinePort: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 1}},
	EngineFreeAutoTime: {numericality: {onlyInteger: true, greaterThenOrEqualTo: 1}},
	EngineFreeUpvotes: {boolIntValidator: true},
	EngineFreeUpvotesRequiredPercent: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 100}},
	EngineFreeUpvotesRequiredMin: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	EngineAutoPlay: {boolIntValidator: true},
	EngineRepeatPlaylist: {boolIntValidator: true},
	EngineMaxDejaVuTime: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	EngineSmartInsert: {boolIntValidator: true},
	EngineJinglesInterval: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	EngineCreatePreviews: {boolIntValidator: true},
	PlayerScreen: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	PlayerFullscreen: {boolIntValidator: true},
	PlayerStayOnTop: {boolIntValidator: true},
	EngineSongPoll: {boolIntValidator: true},
	EngineSongPollChoices: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	EngineSongPollTimeout: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	PlayerMonitor: {boolIntValidator: true},
	PlayerNoHud: {boolIntValidator: true},
	PlayerNoBar: {boolIntValidator: true},
	PlayerPIP: {boolIntValidator: true},
	PlayerPIPSize: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 100}},
	PlayerPIPPositionX: {inclusion: horizontalPosArray},
	PlayerPIPPositionY: {inclusion: verticalPosArray},
	AuthExpireTime: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	WebappMode: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 2}},
	WebappSongLanguageMode: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 3}},
	appFrontendPort: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	appAdminPort: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	appFirstRun: {boolIntValidator: true}
};
