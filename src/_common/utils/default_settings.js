// Karaoke Mugen default configuration file 

// this file is overwritten during updates, editing is ill-advised .
// you can change the default settings by using config.ini to bypass the default value .
export const defaults = { 
	JwtSecret: 'Change me',
	EngineDisplayNickname : 1,
	EngineDisplayConnectionInfo: 1,
	EngineDisplayConnectionInfoQRCode: 1,
	EngineDisplayConnectionInfoMessage: '',
	EngineDisplayConnectionInfoHost: '',
	EnginePrivateMode: 1,
	EngineAllowViewWhitelist: 1,
	EngineAllowViewBlacklist: 1,
	EngineAllowViewBlacklistCriterias: 1,
	EngineSongsPerUser: 10000,
	EngineFreeUpvotes: 1,
	EngineFreeUpvotesRequiredPercent: 33,
	EngineFreeUpvotesRequiredMin: 4,
	EngineAutoPlay: 0,
	EngineRepeatPlaylist: 0,
	EngineMaxDejaVuTime: 60,
	EngineSmartInsert: 0,
	EngineJinglesInterval: 20,
	EngineCreatePreviews: 0,
	PlayerBackground: '',
	PlayerScreen: 0,
	PlayerFullscreen: 0,
	PlayerStayOnTop: 1,
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
	BinffprobeWindows: 'app/bin/ffprobe.exe',
	BinffmpegLinux: '/usr/bin/ffmpeg',
	BinffprobeLinux: '/usr/bin/ffprobe',
	BinffmpegOSX: 'app/bin/ffmpeg',
	BinffprobeOSX: 'app/bin/ffprobe',
	PathBin: 'app/bin',
	PathKaras: 'app/data/karas',
	PathVideos: 'app/data/videos',
	PathSubs: 'app/data/lyrics',
	PathDB: 'app/db',
	PathDBKarasFile: 'karas.sqlite3',
	PathDBUserFile: 'userdata.sqlite3',
	PathAltname: 'app/data/series_altnames.csv',
	PathBackgrounds: 'app/backgrounds',
	PathJingles: 'app/jingles',
	PathTemp: 'app/temp',
	PathPreviews: 'app/previews',
	PathImport: 'app/import',
	PathAvatars: 'app/avatars',
	PathVideosHTTP: '',
	mpvVideoOutput: '',
	AuthExpireTime: 15,
	WebappMode: 2,
	OnlineHost: 'mugen.karaokes.moe',
	OnlinePort: 8800,
	appFrontendPort: 1337,
	appAdminPort: 1338,
	appWSPort: 1340,
	appFirstRun: 1
};