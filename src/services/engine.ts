//Utils
import {getConfig} from '../lib/utils/config';
import {profile} from '../lib/utils/logger';
import readlineSync from 'readline-sync';
import logger from 'winston';
import {getState, setState} from '../utils/state';
import {checkPG, killPG} from '../utils/postgresql';

//KM Modules
import {createPreviews} from '../webapp/previews';
import {initUserSystem} from './user';
import {initDBSystem, getStats} from '../dao/database';
import {closeDB} from '../lib/dao/database';
import {initFrontend} from '../webapp/frontend';
import {initOnlineURLSystem} from '../webapp/online';
import {initPlayer, quitmpv} from './player';
import {initDownloader} from './download';
import {initStats} from './stats';
import {welcomeToYoukousoKaraokeMugen} from './welcome';
import {runBaseUpdate} from '../updater/karabase_updater';
import {initPlaylistSystem, testPlaylists} from './playlist';
import { generateDatabase } from '../lib/services/generation';
import {validateV3} from '../lib/dao/karafile';
import { DBStats } from '../types/database/database';

export async function initEngine() {
	profile('Init');
	const conf = getConfig();
	const state = getState();
	setState({
		fullscreen: conf.Player.FullScreen,
		ontop: conf.Player.StayOnTop,
		private: conf.Karaoke.Private,
	});
	if (state.opt.baseUpdate) try {
		if (await runBaseUpdate()) {
			logger.info('[Engine] Done updating karaoke base');
			setState({opt: {generateDB: true}});
		} else {
			logger.info('[Engine] No updates found, exiting');
			await exit(0);
		}
	} catch (err) {
		logger.error(`[Engine] Update failed : ${err}`);
		await exit(1);
	}
	if (state.opt.validateV3) try {
		logger.info('[Engine] V3 Validation in progress...');
		await validateV3();
		logger.info('[Engine] V3 Validation OK');
		await exit(0);
	} catch(err) {
		logger.error(`[Engine] V3 Validation error : ${err}`);
		await exit(1);
	}
	if (state.opt.validate) try {
		await generateDatabase(true, true);
		await exit(0);
	} catch(err) {
		logger.error(`[Engine] Validation error : ${err}`);
		await exit(1);
	}
	//Database system is the foundation of every other system
	await initDBSystem();
	await initUserSystem();
	if (conf.Online.URL) try {
		await initOnlineURLSystem();
	} catch(err) {
		//Non-blocking
		logger.error(`[Engine] Failed to init online system : ${err}`);
	}
	let inits = [];
	if (conf.Karaoke.CreatePreviews) {
		createPreviews();
	}
	inits.push(initPlaylistSystem());
	if (!state.isDemo && !state.isTest) inits.push(initPlayer());
	inits.push(initFrontend());
	testPlaylists();
	initDownloader();
	if (conf.Online.Stats === true) inits.push(initStats(false));
	//Initialize engine
	// Test if current/public playlists exist
	try {
		await Promise.all(inits);
		//Easter egg
		let ready = 'READY';
		if (Math.floor(Math.random() * Math.floor(10)) >= 9) ready = 'LADY';
		logger.info(`[Engine] Karaoke Mugen is ${ready}`);
		if (!state.isTest) welcomeToYoukousoKaraokeMugen(conf.Frontend.Port);
		setState({ ready: true });
	} catch(err) {
		logger.error(`[Engine] Karaoke Mugen IS NOT READY : ${JSON.stringify(err)}`);
	} finally {
		profile('Init');
	}
}

export async function exit(rc: any) {
	logger.info('[Engine] Shutdown in progress');
	//Exiting on Windows will require a keypress from the user to avoid the window immediately closing on an error.
	//On other systems or if terminal is not a TTY we exit immediately.
	// non-TTY terminals have no stdin support.

	if (getState().player.ready) {
		quitmpv();
		logger.info('[Engine] Player has shutdown');
	}
	closeDB();
	//CheckPG returns if postgresql has been started by Karaoke Mugen or not.
	try {
		if (await checkPG()) {
			try {
				await killPG();
				logger.info('[Engine] PostgreSQL has shutdown');
				mataNe(rc);
			} catch(err) {
				logger.error('[Engine] PostgreSQL could not be stopped!');
				mataNe(rc);
			}
		} else {
			mataNe(rc);
		}
	} catch(err) {
		logger.error(`[Engine] Failed to shutdown PostgreSQL : ${err}`);
		mataNe(1);
	}
}

function mataNe(rc: any) {
	console.log('\nMata ne !\n');
	if (process.platform !== 'win32' || !process.stdout.isTTY) process.exit(rc);
	if (rc !== 0) readlineSync.question('Press enter to exit', {hideEchoBack: true});
	process.exit(rc);
}

export function shutdown() {
	logger.info('[Engine] Dropping the mic, shutting down!');
	exit(0);
}

export async function getKMStats(): Promise<DBStats> {
	return await getStats();
}
