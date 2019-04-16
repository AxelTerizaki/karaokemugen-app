/** Centralized configuration management for Karaoke Mugen. */

import {resolve} from 'path';
import {parse} from 'ini';
import osLocale from 'os-locale';
import i18n from 'i18n';
import {address} from 'ip';
import {configureLogger} from './logger';
import logger from 'winston';
import {copy} from 'fs-extra';
import {asyncExists, asyncReadFile, asyncRename, asyncRequired, asyncWriteFile} from './files';
import {checkBinaries} from './binchecker';
import uuidV4 from 'uuid/v4';
import {configConstraints, defaults} from './default_settings';
import {check} from './validators';
import {publishURL} from '../_webapp/online';
import {playerNeedsRestart} from '../_services/player';
import {getState, setState} from './state';
import testJSON from 'is-valid-json';
import {setSongPoll} from '../_services/poll';
import {initStats, stopStats} from '../_services/stats';
import merge from 'lodash.merge';
import isEqual from 'lodash.isequal';
import {safeDump, safeLoad} from 'js-yaml';
import {clearEmpties, difference} from './object_helpers';
import cloneDeep from 'lodash.clonedeep';

export type PositionX = 'Left' | 'Right' | 'Center';
export type PositionY = 'Top' | 'Bottom' | 'Center';

export interface Config {
	App: {
		JwtSecret: string,
		InstanceID: string,
		FirstRun: boolean,
		karaSuggestionMail: string
	},
	Online: {
		Host: string,
		Port: number,
		Users: boolean,
		URL: boolean,
		Stats: {
			
		}
	},
	Frontend: {
		Port: number,
		Mode: number,
		SeriesLanguageMode: number,
		AuthExpireTime: number,
		Permissions: {
			AllowNicknameChange: boolean,
			AllowViewWhitelist: boolean,
			AllowViewBlacklist: boolean,
			AllowViewBlacklistCriterias: boolean
		}
	},
	Karaoke: {
		Private: boolean,
		Autoplay: boolean,
		Repeat: boolean,
		MaxDejaVuTime: number,
		SmartInsert: boolean,
		CreatePreviews: boolean,
		JinglesInterval: number,
		Display: {
			Avatar: boolean,
			Nickname: boolean,
			ConnectionInfo: {
				Enabled: boolean,
				QRCode: boolean,
				Host: string,
				Message: string
			}
		},
		Poll: {
			Enabled: boolean,
			Choices: number,
			Timeout: number
		},
		Quota: {
			Songs: number,
			Time: number,
			Type: number,
			FreeAutoTime: number,
			FreeUpvotes: boolean,
			FreeUpvotesRequiredPercent: number,
			FreeUpvotesRequiredMin: number
		}
	},
	Player: {
		StayOnTop: boolean,
		FullScreen: boolean,
		Background: string,
		Screen: number,
		VisualizationEffects: boolean,
		Monitor: boolean,
		NoHud: boolean,
		NoBar: boolean,
		mpvVideoOutput: string,
		PIP: {
			Enabled: boolean,
			Size: number,
			PositionX: PositionX,
			PositionY: PositionY
		}
	},
	Playlist: {
		AllowDuplicates: boolean,
		MaxDejaVuTime: number,
		RemovePublicOnPlay: boolean
	},
	System: {
		Binaries: {
			Player: {
				Windows: string,
				OSX: string,
				Linux: string
			},
			Postgres: {
				Windows: string,
				OSX: string,
				Linux: string
			},
			ffmpeg: {
				Windows: string,
				OSX: string,
				Linux: string
			}
		},
		Path: {
			Bin: string,
			Karas: string[],
			Medias: string[],
			Lyrics: string[],
			DB: string,
			Series: string[],
			Backgrounds: string[],
			Jingles: string[],
			Temp: string,
			Previews: string,
			Import: string,
			Avatars: string,
			MediasHTTP: string
		}
	},
	Database: {
		'sql-file': boolean,
		defaultEnv: string,
		prod: {
			driver: string,
			host: string,
			port: number,
			user: string,
			password: string,
			superuser: string,
			superuserPassword: string,
			schema: string,
			database: string,
			bundledPostgresBinary: boolean
		}
	}
}

/** Object containing all config */
let config: Config = getDefaultConfig();
let configFile = 'config.yml';
let configReady;

/**
 * We return a copy of the configuration data so the original one can't be modified
 * without passing by this module's functions.
 */
export function getConfig(): Config {
	return {...config};
}

export async function editSetting(part) {
	const oldConfig = cloneDeep(config);
	const newConfig = merge(config, part);
	verifyConfig(newConfig);
	await mergeConfig(newConfig, oldConfig);
	return config;
}

export function verifyConfig(conf) {
	const validationErrors = check(conf, configConstraints);
	if (validationErrors) {
		throw `Config is not valid: ${JSON.stringify(validationErrors)}`;
	}
}

export async function mergeConfig(newConfig, oldConfig) {
	// Determine if mpv needs to be restarted
	if (!isEqual(oldConfig.Player, newConfig.Player)) {
		//If these two settings haven't been changed, it means another one has, so we're restarting mpv
		if (oldConfig.Player.Fullscreen === newConfig.Player.Fullscreen && oldConfig.Player.StayOnTop === newConfig.Player.StayOnTop) {
			playerNeedsRestart();
			logger.debug('[Config] Setting mpv to restart after next song');
		}
	}

	if (newConfig.Online.URL && getState().ready) publishURL();
	setConfig(newConfig);
	setSongPoll(config.Karaoke.Poll.Enabled);
	// Toggling stats
	config.Online.Stats
		? initStats()
		: stopStats();
	// Toggling and updating settings
	setState({private: config.Karaoke.Private});
	configureHost();
}

function getDefaultConfig(): Config {
	return {
		App: {
			JwtSecret: undefined,
			InstanceID: undefined,
			FirstRun: undefined,
			karaSuggestionMail: undefined
		},
		Online: {
			Host: undefined,
			Port: undefined,
			Users: undefined,
			URL: undefined,
			Stats: {}
		},
		Frontend: {
			Port: undefined,
			Mode: undefined,
			SeriesLanguageMode: undefined,
			AuthExpireTime: undefined,
			Permissions: {
				AllowNicknameChange: undefined,
				AllowViewWhitelist: undefined,
				AllowViewBlacklist: undefined,
				AllowViewBlacklistCriterias: undefined
			}
		},
		Karaoke: {
			Private: undefined,
			Autoplay: undefined,
			Repeat: undefined,
			MaxDejaVuTime: undefined,
			SmartInsert: undefined,
			CreatePreviews: undefined,
			JinglesInterval: undefined,
			Display: {
				Avatar: undefined,
				Nickname: undefined,
				ConnectionInfo: {
					Enabled: undefined,
					QRCode: undefined,
					Host: undefined,
					Message: undefined
				}
			},
			Poll: {
				Enabled: undefined,
				Choices: undefined,
				Timeout: undefined
			},
			Quota: {
				Songs: undefined,
				Time: undefined,
				Type: undefined,
				FreeAutoTime: undefined,
				FreeUpvotes: undefined,
				FreeUpvotesRequiredPercent: undefined,
				FreeUpvotesRequiredMin: undefined
			}
		},
		Player: {
			StayOnTop: undefined,
			FullScreen: undefined,
			Background: undefined,
			Screen: undefined,
			VisualizationEffects: undefined,
			Monitor: undefined,
			NoHud: undefined,
			NoBar: undefined,
			mpvVideoOutput: undefined,
			PIP: {
				Enabled: undefined,
				Size: undefined,
				PositionX: undefined,
				PositionY: undefined
			}
		},
		Playlist: {
			AllowDuplicates: undefined,
			MaxDejaVuTime: undefined,
			RemovePublicOnPlay: undefined
		},
		System: {
			Binaries: {
				Player: {
					Windows: undefined,
					OSX: undefined,
					Linux: undefined
				},
				Postgres: {
					Windows: undefined,
					OSX: undefined,
					Linux: undefined
				},
				ffmpeg: {
					Windows: undefined,
					OSX: undefined,
					Linux: undefined
				}
			},
			Path: {
				Bin: undefined,
				Karas: undefined,
				Medias: undefined,
				Lyrics: undefined,
				DB: undefined,
				Series: undefined,
				Backgrounds: undefined,
				Jingles: undefined,
				Temp: undefined,
				Previews: undefined,
				Import: undefined,
				Avatars: undefined,
				MediasHTTP: undefined
			}
		},
		Database: {
			'sql-file': undefined,
			defaultEnv: undefined,
			prod: {
				driver: undefined,
				host: undefined,
				port: undefined,
				user: undefined,
				password: undefined,
				superuser: undefined,
				superuserPassword: undefined,
				schema: undefined,
				database: undefined,
				bundledPostgresBinary: undefined
			}
		}
	};
}

async function importIniFile(iniFile) {
	//Imports old KM config INI and transforms it to our new config object overlord
	const content = await asyncReadFile(iniFile, 'utf-8');
	const ini = parse(content);
	const c = getDefaultConfig();
	if (ini.JwtSecret) c.App.JwtSecret = ini.JwtSecret;
	if (ini.EngineDisplayNickname) c.Karaoke.Display.Nickname = true;
	if (ini.EngineDisplayConnectionInfo == 0) c.Karaoke.Display.ConnectionInfo.Enabled = false;
	if (ini.EngineDisplayConnectionQRCode == 0) c.Karaoke.Display.ConnectionInfo.QRCode = false;
	if (ini.EngineDisplayConnectionMessage) c.Karaoke.Display.ConnectionInfo.Enabled = ini.EngineDisplayConnectionMessage;
	if (ini.EngineDisplayConnectionInfoHost) c.Karaoke.Display.ConnectionInfo.Host = ini.EngineDisplayConnectionInfoHost;
	if (ini.EnginePrivateMode == 0) c.Karaoke.Private = false;
	if (ini.EngineAllowViewWhitelist == 0) c.Frontend.Permissions.AllowViewWhitelist = false;
	if (ini.EngineAllowViewBlacklist == 0) c.Frontend.Permissions.AllowViewBlacklist = false;
	if (ini.EngineAllowViewBlacklistCriterias == 0) c.Frontend.Permissions.AllowViewBlacklistCriterias = false;
	if (ini.EngineAllowDuplicates) c.Playlist.AllowDuplicates = true;
	if (ini.EngineSongsPerUser) c.Karaoke.Quota.Songs = +ini.EngineSongsPerUser;
	if (ini.EngineTimePerUser) c.Karaoke.Quota.Time = +ini.EngineTimePerUser;
	if (ini.EngineQuotaType) c.Karaoke.Quota.Type = +ini.EngineQuotaType;
	if (ini.EngineFreeAutoTime) c.Karaoke.Quota.FreeAutoTime = +ini.EngineFreeAutoTime;
	if (ini.EngineFreeUpvotes) c.Karaoke.Quota.FreeUpvotes = false;
	if (ini.EngineFreeUpvotesRequiredPercent) c.Karaoke.Quota.FreeUpvotesRequiredPercent = +ini.EngineFreeUpvotesRequiredPercent;
	if (ini.EngineFreeUpvotesRequiredMin) c.Karaoke.Quota.FreeUpvotesRequiredMin = +ini.EngineFreeUpvotesRequiredMin;
	if (ini.EngineAutoPlay) c.Karaoke.Autoplay = true;
	if (ini.EngineRepeatPlaylist) c.Karaoke.Repeat = true;
	if (ini.EngineMaxDejaVuTime) c.Playlist.MaxDejaVuTime = +ini.EngineMaxDejaVuTime;
	if (ini.EngineSmartInsert) c.Karaoke.SmartInsert = true;
	if (ini.EngineJinglesInterval) c.Karaoke.JinglesInterval = ini.EngineJinglesInterval;
	if (ini.EngineCreatePreviews) c.Karaoke.CreatePreviews = true;
	if (ini.EngineSongPoll) c.Karaoke.Poll.Enabled = true;
	if (ini.EngineSongPollChoices) c.Karaoke.Poll.Choices = +ini.EngineSongPollChoices;
	if (ini.EngineSongPollTimeout) c.Karaoke.Poll.Timeout = +ini.EngineSongPollTimeout;
	if (ini.EngineRemovePublicOnPlay) c.Playlist.RemovePublicOnPlay = true;
	if (ini.PlayerBackground) c.Player.Background = ini.PlayerBackground;
	if (ini.PlayerScreen) c.Player.Screen = +ini.PlayerScreen;
	if (ini.PlayerFullScreen) c.Player.FullScreen = true;
	if (ini.PlayerStayOnTop) c.Player.StayOnTop = false;
	if (ini.PlayerVisualizationEffects) c.Player.VisualizationEffects = true;
	if (ini.PlayerMonitor) c.Player.Monitor = true;
	if (ini.PlayerNoHud) c.Player.NoHud = false;
	if (ini.PlayerNoBar) c.Player.NoBar = false;
	if (ini.PlayerPIP) c.Player.PIP.Enabled = true;
	if (ini.PlayerPIPSize) c.Player.PIP.Size = +ini.PlayerPIPSize;
	if (ini.PlayerPIPPositionX) c.Player.PIP.PositionX = ini.PlayerPIPPositionX;
	if (ini.PlayerPIPPositionY) c.Player.PIP.PositionY = ini.PlayerPIPPositionY;
	if (ini.BinPlayerWindows) c.System.Binaries.Player.Windows = ini.BinPlayerWindows;
	if (ini.BinPlayerOSX) c.System.Binaries.Player.OSX = ini.BinPlayerOSX;
	if (ini.BinPlayerLinux) c.System.Binaries.Player.Linux = ini.BinPlayerLinux;
	if (ini.BinPostgresWindows) c.System.Binaries.Postgres.Windows = ini.BinPostgresWindows;
	if (ini.BinPostgresOSX) c.System.Binaries.Postgres.OSX = ini.BinPostgresOSX;
	if (ini.BinPostgresLinux) c.System.Binaries.Postgres.Linux = ini.BinPostgresLinux;
	if (ini.BinffmpegWindows) c.System.Binaries.ffmpeg.Windows = ini.BinffmpegWindows;
	if (ini.BinffmpegLinux) c.System.Binaries.ffmpeg.Linux = ini.BinffmpegLinux;
	if (ini.BinffmpegOSX) c.System.Binaries.ffmpeg.OSX = ini.BinffmpegOSX;
	if (ini.PathBin) c.System.Path.Bin = ini.PathBin;
	if (ini.PathKaras) c.System.Path.Karas = ini.PathKaras.split('|');
	if (ini.PathMedias) c.System.Path.Medias = ini.PathMedias.split('|');
	if (ini.PathSubs) c.System.Path.Lyrics = ini.PathSubs.split('|');
	if (ini.PathDB) c.System.Path.DB = ini.PathDB;
	if (ini.PathSeries) c.System.Path.Series = ini.PathSeries.split('|');
	if (ini.PathBackgrounds) c.System.Path.Backgrounds = ini.PathBackgrounds.split('|');
	if (ini.PathJingles) c.System.Path.Jingles = ini.PathJingles.split('|');
	if (ini.PathTemp) c.System.Path.Temp = ini.PathTemp;
	if (ini.PathPreviews) c.System.Path.Previews = ini.PathPreviews;
	if (ini.PathImport) c.System.Path.Import = ini.PathImport;
	if (ini.PathAvatars) c.System.Path.Avatars = ini.PathAvatars;
	if (ini.PathMediasHTTP) c.System.Path.MediasHTTP = ini.PathMediasHTTP;
	if (ini.mpvVideoOutput) c.Player.mpvVideoOutput = ini.mpvVideoOutput;
	if (ini.AuthExpireTime) c.Frontend.AuthExpireTime = +ini.AuthExpireTime;
	if (ini.WebappMode) c.Frontend.Mode = +ini.WebappMode;
	if (ini.WebappSongLanguageMode) c.Frontend.SeriesLanguageMode = +ini.WebappSongLanguageMode;
	if (ini.OnlineUsers) c.Online.Users = true;
	if (ini.OnlineURL) c.Online.URL = true;
	if (ini.OnlineMode) c.Online.URL = true;
	if (ini.OnlineHost) c.Online.Host = ini.OnlineHost;
	if (ini.OnlineStats > -1) c.Online.Stats = ini.OnlineStats === 1;
	if (ini.appInstanceID) c.App.InstanceID = ini.appInstanceID;
	if (ini.appFrontendPort) c.Frontend.Port = +ini.appFrontendPort;
	if (ini.appFirstRun) c.App.FirstRun = false;
	if (ini.karaSuggestionMail) c.App.karaSuggestionMail = ini.karaSuggestionMail;
	// Phew, now we have our c object.
	// Write config back to YAML
	await updateConfig(c);
	await asyncRename(iniFile, `${iniFile}_old`);
}

/** Initializing configuration */
export async function initConfig(argv) {
	let appPath = getState().appPath;
	if (argv.config) configFile = argv.config;
	await configureLogger(appPath, !!argv.debug);
	await configureLocale();
	//Import config.ini file if it exists
	const iniFile = resolve(appPath, 'config.ini');
	if (await asyncExists(iniFile)) await importIniFile(iniFile);

	await loadConfigFiles(appPath);
	configReady = true;
	configureHost();
	if (config.App.JwtSecret === 'Change me') setConfig({App: {JwtSecret: uuidV4() }});
	if (config.App.InstanceID === 'Change me') setConfig({App: {InstanceID: uuidV4() }});
	return getConfig();
}

async function loadConfigFiles(appPath) {
	const overrideConfigFile = resolve(appPath, configFile);
	const databaseConfigFile = resolve(appPath, 'database.json');
	const versionFile = resolve(__dirname, '../version.yml');
	config = merge(config, defaults);
	setState({appPath: appPath});
	if (await asyncExists(overrideConfigFile)) await loadConfig(overrideConfigFile);
	if (await asyncExists(versionFile)) await loadVersion(versionFile);
	if (await asyncExists(databaseConfigFile)) {
		const dbConfig = await loadDBConfig(databaseConfigFile);
		config.Database = merge(config.Database, dbConfig);
	}
}

async function loadVersion(versionFile) {
	const content = await asyncReadFile(versionFile, 'utf-8');
	const parsedContent = safeLoad(content);
	setState({version: {...parsedContent}});
}

async function loadDBConfig(configFile) {
	const configData = await asyncReadFile(configFile, 'utf-8');
	if (!testJSON(configData)) {
		logger.error('[Config] Database config file is not valid JSON');
		throw 'Syntax error in database.json';
	}
	return JSON.parse(configData);
}

async function loadConfig(configFile) {
	logger.debug(`[Config] Reading configuration file ${configFile}`);
	await asyncRequired(configFile);
	const content = await asyncReadFile(configFile, 'utf-8');
	const parsedContent = safeLoad(content);
	const newConfig = merge(config, parsedContent);
	verifyConfig(newConfig);
	config = {...newConfig};
}

async function configureLocale() {
	i18n.configure({
		directory: resolve(__dirname, '../_locales'),
		defaultLocale: 'en',
		cookie: 'locale',
		register: global
	});
	let detectedLocale = await osLocale();
	detectedLocale = detectedLocale.substring(0, 2);
	i18n.setLocale(detectedLocale);
	setState( {EngineDefaultLocale: detectedLocale });
}

export async function configureBinaries(config) {
	logger.debug('[Launcher] Checking if binaries are available');
	const binaries = await checkBinaries(config);
	setState({binPath: binaries});
}

export function configureHost() {
	let URLPort = `:${config.Frontend.Port}`;
	setState({osHost: address()});
	if (+config.Online.Port === 80) URLPort = '';
	if (config.Online.URL) {
		setState({osURL: `http://${config.Online.Host}`});
	} else {
		if (!config.Karaoke.Display.ConnectionInfo.Host) {
			setState({osURL: `http://${address()}${URLPort}`});
		} else {
			setState({osURL: `http://${config.Karaoke.Display.ConnectionInfo.Host}${URLPort}`});
		}
	}
}

export async function setConfig(configPart) {
	config = merge(config, configPart);
	if (configReady) updateConfig(config);
	return getConfig();
}

export async function backupConfig() {
	// Create a backup of our config file. Just in case.
	logger.debug('[Config] Making a backup of config.yml');
	return await copy(
		resolve(getState().appPath, 'config.yml'),
		resolve(getState().appPath, 'config.backup.yml'),
		{ overwrite: true }
	);
}

export function getPublicConfig() {
	const publicSettings = {...config};
	delete publicSettings.App;
	delete publicSettings.Database;
	delete publicSettings.System;
	return publicSettings;
}

export async function updateConfig(newConfig) {
	const filteredConfig = difference(newConfig, defaults);
	clearEmpties(filteredConfig);
	delete filteredConfig.Database;
	logger.debug('[Config] Settings being saved : '+JSON.stringify(filteredConfig));
	await asyncWriteFile(resolve(getState().appPath, configFile), safeDump(filteredConfig), 'utf-8');
}

/**
 * Functions used to manipulate configuration. We can pass a optional config object.
 * In this case, the method works with the configuration passed as argument rather than the current
 * configuration.
 */

export function resolvedPathKaras() {
	return config.System.Path.Karas.map(path => resolve(getState().appPath, path));
}

export function resolvedPathSeries() {
	return config.System.Path.Series.map(path => resolve(getState().appPath, path));
}

export function resolvedPathJingles() {
	return config.System.Path.Jingles.map(path => resolve(getState().appPath, path));
}

export function resolvedPathBackgrounds() {
	return config.System.Path.Backgrounds.map(path => resolve(getState().appPath, path));
}

export function resolvedPathSubs() {
	return config.System.Path.Lyrics.map(path => resolve(getState().appPath, path));
}

export function resolvedPathMedias() {
	return config.System.Path.Medias.map(path => resolve(getState().appPath, path));
}

export function resolvedPathImport() {
	return resolve(getState().appPath, config.System.Path.Import);
}

export function resolvedPathTemp() {
	return resolve(getState().appPath, config.System.Path.Temp);
}

export function resolvedPathPreviews() {
	return resolve(getState().appPath, config.System.Path.Previews);
}