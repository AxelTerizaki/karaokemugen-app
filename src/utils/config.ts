/** Centralized configuration management for Karaoke Mugen. */

import {resolve} from 'path';
import {address} from 'ip';
import logger from '../lib/utils/logger';
import {asyncCopy, asyncRequired} from '../lib/utils/files';
import {configureIDs, configureLocale, loadConfigFiles, setConfig, verifyConfig, getConfig, setConfigConstraints} from '../lib/utils/config';
import {configConstraints, defaults} from './default_settings';
import {publishURL} from '../webapp/online';
import {playerNeedsRestart} from '../services/player';
import {getState, setState} from './state';
import {setSongPoll} from '../services/poll';
import {initStats, stopStats} from '../services/stats';
import merge from 'lodash.merge';
import isEqual from 'lodash.isequal';
import cloneDeep from 'lodash.clonedeep';
import {Config} from '../types/config';
import { listUsers } from '../dao/user';
import { updateSongsLeft } from '../services/user';
import { emitWS } from '../lib/utils/ws';
import { emit } from '../lib/utils/pubsub';
import { BinariesConfig } from '../types/binChecker';
import { exit } from '../services/engine';

export async function editSetting(part: object) {
	const config = getConfig();
	const oldConfig = cloneDeep(config);
	const newConfig = merge(config, part);
	verifyConfig(newConfig);
	await mergeConfig(newConfig, oldConfig);
	emitWS('settingsUpdated', config);
	return config;
}

export async function mergeConfig(newConfig: Config, oldConfig: Config) {
	// Determine if mpv needs to be restarted
	if (!isEqual(oldConfig.Player, newConfig.Player)) {
		//If these two settings haven't been changed, it means another one has, so we're restarting mpv
		if (oldConfig.Player.FullScreen === newConfig.Player.FullScreen && oldConfig.Player.StayOnTop === newConfig.Player.StayOnTop) {
			playerNeedsRestart();
			logger.debug('[Config] Setting mpv to restart after next song');
		}
	}
	if (newConfig.Online.URL && getState().ready) publishURL();
	// Updating quotas
	if (newConfig.Karaoke.Quota.Type !== oldConfig.Karaoke.Quota.Type || newConfig.Karaoke.Quota.Songs !== oldConfig.Karaoke.Quota.Songs || newConfig.Karaoke.Quota.Time !== oldConfig.Karaoke.Quota.Time) {
		const users = await listUsers();
		users.map(u => u.login).forEach(username => {
			updateSongsLeft(username, getState().modePlaylistID);
		});
	}

	const config = setConfig(newConfig);
	setSongPoll(config.Karaoke.Poll.Enabled);
	// Toggling stats
	if (config.Online.Stats) {
		initStats(newConfig.Online.Stats === oldConfig.Online.Stats);
	} else {
		stopStats();
	}
	// Toggling and updating settings
	setState({private: config.Karaoke.Private});
	configureHost();
}

/** Initializing configuration */
export async function initConfig(argv: any) {
	let appPath = getState().appPath;
	setConfigConstraints(configConstraints);
	await configureLocale();
	await loadConfigFiles(appPath, argv.config, defaults);
	const binaries = await checkBinaries(getConfig());
	setState({binPath: binaries});
	emit('configReady');
	configureHost();
	configureIDs();
	return getConfig();
}

export function configureHost() {
	const config = getConfig();
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


export async function backupConfig() {
	// Create a backup of our config file. Just in case.
	logger.debug('[Config] Making a backup of config.yml');
	return await asyncCopy(
		resolve(getState().appPath, 'config.yml'),
		resolve(getState().appPath, 'config.backup.yml'),
		{ overwrite: true }
	);
}

export function getPublicConfig() {
	const publicSettings = {...getConfig()};
	delete publicSettings.App;
	delete publicSettings.Database;
	delete publicSettings.System;
	return publicSettings;
}

// Check if binaries are available
// Provide their paths for runtime

async function checkBinaries(config: Config): Promise<BinariesConfig> {

	const binariesPath = configuredBinariesForSystem(config);
	let requiredBinariesChecks = [];
	requiredBinariesChecks.push(asyncRequired(binariesPath.ffmpeg));
	if (config.Database.prod.bundledPostgresBinary) requiredBinariesChecks.push(asyncRequired(resolve(binariesPath.postgres, binariesPath.postgres_ctl)));
	if (!getState().isTest && !getState().isDemo) requiredBinariesChecks.push(asyncRequired(binariesPath.mpv));

	try {
		await Promise.all(requiredBinariesChecks);
	} catch (err) {
		binMissing(binariesPath, err);
		await exit(1);
	}

	return binariesPath;
}

function configuredBinariesForSystem(config: Config): BinariesConfig {
	switch (process.platform) {
	case 'win32':
		return {
			ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.Windows),
			mpv: resolve(getState().appPath, config.System.Binaries.Player.Windows),
			postgres: resolve(getState().appPath, config.System.Binaries.Postgres.Windows),
			postgres_ctl: 'pg_ctl.exe',
			postgres_dump: 'pg_dump.exe'
		};
	case 'darwin':
		return {
			ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.OSX),
			mpv: resolve(getState().appPath, config.System.Binaries.Player.OSX),
			postgres: resolve(getState().appPath, config.System.Binaries.Postgres.OSX),
			postgres_ctl: 'pg_ctl',
			postgres_dump: 'pg_dump'
		};
	default:
		return {
			ffmpeg: resolve(getState().appPath, config.System.Binaries.ffmpeg.Linux),
			mpv: resolve(getState().appPath, config.System.Binaries.Player.Linux),
			postgres: resolve(getState().appPath, config.System.Binaries.Postgres.Linux),
			postgres_ctl: 'pg_ctl',
			postgres_dump: 'pg_dump'
		};
	}
}

function binMissing(binariesPath: any, err: string) {
	logger.error('[BinCheck] One or more binaries could not be found! (' + err + ')');
	logger.error('[BinCheck] Paths searched : ');
	logger.error('[BinCheck] ffmpeg : ' + binariesPath.ffmpeg);
	logger.error('[BinCheck] mpv : ' + binariesPath.mpv);
	logger.error('[BinCheck] Postgres : ' + binariesPath.postgres);
	logger.error('[BinCheck] Exiting...');
	console.log('\n');
	console.log('One or more binaries needed by Karaoke Mugen could not be found.');
	console.log('Check the paths above and make sure these are available.');
	console.log('Edit your config.yml and set System.Binaries.ffmpeg and System.Binaries.Player variables correctly for your OS.');
	console.log('You can download mpv for your OS from http://mpv.io/');
	console.log('You can download postgres for your OS from http://postgresql.org/');
	console.log('You can download ffmpeg for your OS from http://ffmpeg.org');
}
