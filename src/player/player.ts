import i18n from 'i18n';
import logger from 'winston';
import {resolvedPathBackgrounds, getConfig} from '../lib/utils/config';
import {resolve, extname} from 'path';
import {resolveFileInDirs, isImageFile, asyncReadDir, asyncExists} from '../lib/utils/files';
import sample from 'lodash.sample';
import sizeOf from 'image-size';
import {getSingleJingle, buildJinglesList} from './jingles';
import {buildQRCode} from './qrcode';
import {exit} from '../services/engine';
import {playerEnding} from '../services/player';
import {getID3} from './id3tag';
import mpv from 'node-mpv';
import {promisify} from 'util';
import {endPoll} from '../services/poll';
import {getState, setState} from '../utils/state';
import execa from 'execa';
import semver from 'semver';
import { imageFileTypes } from '../lib/utils/constants';
import {PlayerState, MediaData, mpvStatus} from '../types/player';
import retry from 'p-retry';

const sleep = promisify(setTimeout);

let displayingInfo = false;
let player: any;
let playerMonitor: any;
let monitorEnabled = false;
let songNearEnd = false;

let playerState: PlayerState = {
	volume: 100,
	playing: false,
	playerstatus: 'stop',
	_playing: false, // internal delay flag
	timeposition: 0,
	duration: 0,
	mutestatus: false,
	subtext: null,
	currentSongInfos: null,
	mediaType: 'background',
	showsubs: true,
	stayontop: false,
	fullscreen: false,
	ready: false,
	url: null
};

function emitPlayerState() {
	setState({player: playerState});
}

async function extractAllBackgroundFiles(): Promise<string[]> {
	let backgroundFiles = [];
	for (const resolvedPath of resolvedPathBackgrounds()) {
		backgroundFiles = backgroundFiles.concat(await extractBackgroundFiles(resolvedPath));
	}
	// Return only files which have an extension included in the imageFileTypes array
	return backgroundFiles.filter(f => imageFileTypes.includes(extname(f).substring(1)));
}

async function extractBackgroundFiles(backgroundDir: string): Promise<string[]> {
	const backgroundFiles = [];
	const dirListing = await asyncReadDir(backgroundDir);
	for (const file of dirListing) {
		if (isImageFile(file)) backgroundFiles.push(resolve(backgroundDir, file));
	}
	return backgroundFiles;
}

export async function loadBackground() {
	const conf = getConfig();
	// Default background
	let backgroundFiles = [];
	const defaultImageFile = resolve(getState().appPath,conf.System.Path.Temp,'default.jpg');
	let backgroundImageFile = defaultImageFile;
	if (conf.Player.Background) {
		backgroundImageFile = resolve(getState().appPath, conf.System.Path.Backgrounds[0], conf.Player.Background);
		if (await asyncExists(backgroundImageFile)) {
			// Background provided in config file doesn't exist, reverting to default one provided.
			logger.warn(`[Player] Unable to find background file ${backgroundImageFile}, reverting to default one`);
			backgroundFiles.push(defaultImageFile);
		}
	} else {
		// PlayerBackground is empty, thus we search through all backgrounds paths and pick one at random
		backgroundFiles = await extractAllBackgroundFiles();
		// If backgroundFiles is empty, it means no file was found in the directories scanned.
		// Reverting to original, supplied background :
		if (backgroundFiles.length === 0) backgroundFiles.push(defaultImageFile);
	}
	backgroundImageFile = sample(backgroundFiles);
	logger.debug(`[Player] Background ${backgroundImageFile}`);
	let videofilter = '';
	if (conf.Karaoke.Display.ConnectionInfo.QRCode &&
		conf.Karaoke.Display.ConnectionInfo.Enabled ) {
		//Positionning QR Code according to video size
		const dimensions = sizeOf(backgroundImageFile);
		let QRCodeWidth, QRCodeHeight;
		QRCodeWidth = QRCodeHeight = Math.floor(dimensions.width*0.10);

		const posX = Math.floor(dimensions.width*0.015);
		const posY = Math.floor(dimensions.height*0.015);
		const qrCode = resolve(getState().appPath,conf.System.Path.Temp,'qrcode.png').replace(/\\/g,'/');
		videofilter = `lavfi-complex=movie=\\'${qrCode}\\'[logo];[logo][vid1]scale2ref=${QRCodeWidth}:${QRCodeHeight}[logo1][base];[base][logo1]overlay=${posX}:${posY}[vo]`;
	}
	try {
		logger.debug(`[Player] Background videofilter : ${videofilter}`);
		const loads = [
			player.load(backgroundImageFile, 'replace', [videofilter])
		];
		if (monitorEnabled) loads.push(playerMonitor.load(backgroundImageFile, 'replace', [videofilter]));
		await Promise.all(loads);
		displayInfo();
	} catch(err) {
		logger.error(`[Player] Unable to load background : ${JSON.stringify(err)}`);
	}
}

export async function initPlayerSystem() {
	const state = getState();
	playerState.fullscreen = state.fullscreen;
	playerState.stayontop = state.ontop;
	buildJinglesList();
	await buildQRCode(state.osURL);
	logger.debug('[Player] QRCode generated');
	await startmpv();
	emitPlayerState();
	logger.debug('[Player] Player is READY');
}

async function getmpvVersion(path: string): Promise<string> {
	const output = await execa(path,['--version']);
	return semver.valid(output.stdout.split(' ')[1]);
}

async function startmpv() {
	const conf = getConfig();
	const state = getState();
	if (conf.Player.Monitor) {
		monitorEnabled = true;
	} else {
		monitorEnabled = false;
	}
	let mpvOptions = [
		'--keep-open=yes',
		'--fps=60',
		'--no-border',
		'--osd-level=0',
		'--sub-codepage=UTF-8-BROKEN',
		`--log-file=${resolve(state.appPath,'mpv.log')}`,
		`--volume=${+playerState.volume}`,
		`--input-conf=${resolve(state.appPath,conf.System.Path.Temp,'input.conf')}`,
		'--autoload-files=no'
	];
	if (conf.Player.PIP.Enabled) {
		mpvOptions.push(`--autofit=${conf.Player.PIP.Size}%x${conf.Player.PIP.Size}%`);
		// By default, center.
		let positionX = 50;
		let positionY = 50;
		if (conf.Player.PIP.PositionX === 'Left') positionX = 1;
		if (conf.Player.PIP.PositionX === 'Center') positionX = 50;
		if (conf.Player.PIP.PositionX === 'Right') positionX = 99;
		if (conf.Player.PIP.PositionY === 'Top') positionY = 5;
		if (conf.Player.PIP.PositionY === 'Center') positionY = 50;
		if (conf.Player.PIP.PositionY === 'Bottom') positionY = 99;
		mpvOptions.push(`--geometry=${positionX}%:${positionY}%`);
	}
	if (conf.Player.mpvVideoOutput) mpvOptions.push(`--vo=${conf.Player.mpvVideoOutput}`);
	if (conf.Player.Screen) {
		mpvOptions.push(`--screen=${conf.Player.Screen}`);
		mpvOptions.push(`--fs-screen=${conf.Player.Screen}`);
	}
	// Fullscreen is disabled if pipmode is set.
	if (conf.Player.FullScreen && !conf.Player.PIP.Enabled) {
		mpvOptions.push('--fullscreen');
		playerState.fullscreen = true;
	}
	if (conf.Player.StayOnTop) {
		playerState.stayontop = true;
		mpvOptions.push('--ontop');
	}
	if (conf.Player.NoHud) mpvOptions.push('--no-osc');
	if (conf.Player.NoBar) mpvOptions.push('--no-osd-bar');
	//On all platforms, check if we're using mpv at least version 0.25 or abort saying the mpv provided is too old.
	//Assume UNKNOWN is a compiled version, and thus the most recent one.
	let mpvVersion = await getmpvVersion(state.binPath.mpv);
	mpvVersion = mpvVersion.split('-')[0];
	logger.debug(`[Player] mpv version : ${mpvVersion}`);

	//If we're on macOS, add --no-native-fs to get a real
	// fullscreen experience on recent macOS versions.
	if (!semver.satisfies(mpvVersion, '>=0.25.0')) {
		// Version is too old. Abort.
		logger.error(`[Player] mpv version detected is too old (${mpvVersion}). Upgrade your mpv from http://mpv.io to at least version 0.25`);
		logger.error(`[Player] mpv binary : ${state.binPath.mpv}`);
		logger.error('[Player] Exiting due to obsolete mpv version');
		await exit(1);
	}
	if (state.os === 'darwin' && semver.satisfies(mpvVersion, '0.27.x')) mpvOptions.push('--no-native-fs');
	logger.debug(`[Player] mpv options : ${mpvOptions}`);
	logger.debug(`[Player] mpv binary : ${state.binPath.mpv}`);
	let socket: string;
	// Name socket file accordingly depending on OS.
	state.os === 'win32'
		? socket = '\\\\.\\pipe\\mpvsocket'
		: socket = '/tmp/km-node-mpvsocket';
	player = new mpv(
		{
			ipc_command: '--input-ipc-server',
			auto_restart: true,
			audio_only: false,
			binary: state.binPath.mpv,
			socket: socket,
			time_update: 1,
			verbose: false,
			debug: false,
		},
		mpvOptions
	);
	if (monitorEnabled) {
		mpvOptions = [
			'--keep-open=yes',
			'--fps=60',
			'--osd-level=0',
			'--sub-codepage=UTF-8-BROKEN',
			'--ontop',
			'--no-osc',
			'--no-osd-bar',
			'--geometry=1%:99%',
			`--autofit=${conf.Player.PIP.Size}%x${conf.Player.PIP.Size}%`,
			'--autoload-files=no'
		];
		if (conf.Player.mpvVideoOutput) {
			mpvOptions.push(`--vo=${conf.Player.mpvVideoOutput}`);
		} else {
			//Force direct3d for Windows users
			if (state.os === 'win32') mpvOptions.push('--vo=direct3d');
		}
		playerMonitor = new mpv(
			{
				ipc_command: '--input-ipc-server',
				auto_restart: true,
				audio_only: false,
				binary: state.binPath.mpv,
				socket: `${socket}2`,
				time_update: 1,
				verbose: false,
				debug: false,
			},
			mpvOptions
		);
	}
	// Starting up mpv
	try {
		const promises = [
			player.start()
		];
		if (monitorEnabled) promises.push(playerMonitor.start());
		await Promise.all(promises);
	} catch(err) {
		logger.error(`[Player] mpvAPI : ${err}`);
		throw err;
	}
	await loadBackground();
	player.observeProperty('sub-text',13);
	player.observeProperty('playtime-remaining',14);
	player.observeProperty('eof-reached',15);
	player.on('statuschange', (status: mpvStatus) => {
		// If we're displaying an image, it means it's the pause inbetween songs
		if (playerState._playing && status && ((status['playtime-remaining'] !== null && status['playtime-remaining'] >= 0 && status['playtime-remaining'] <= 1 && status.pause) || status['eof-reached']) ) {
			// immediate switch to Playing = False to avoid multiple trigger
			playerState.playing = false;
			playerState._playing = false;
			playerState.playerstatus = 'stop';
			player.pause();
			if (monitorEnabled) playerMonitor.pause();
			playerEnding();
		}

		playerState.mutestatus = status.mute;
		playerState.duration = status.duration;
		playerState.subtext = status['sub-text'];
		playerState.volume = status.volume;
		playerState.fullscreen = status.fullscreen;
		emitPlayerState();
	});
	player.on('paused',() => {
		logger.debug( '[Player] Paused event triggered');
		playerState.playing = false;
		playerState.playerstatus = 'pause';
		if (monitorEnabled) playerMonitor.pause();
		emitPlayerState();
	});
	player.on('resumed',() => {
		logger.debug( '[Player] Resumed event triggered');
		playerState.playing = true;
		playerState.playerstatus = 'play';
		if (monitorEnabled) playerMonitor.play();
		emitPlayerState();
	});
	player.on('timeposition', (position: number) => {
		// Returns the position in seconds in the current song
		playerState.timeposition = position;
		emitPlayerState();
		// Display informations if timeposition is 8 seconds before end of song
		if (position >= (playerState.duration - 8) &&
						!displayingInfo &&
						playerState.mediaType === 'song')
			displaySongInfo(playerState.currentSongInfos);
		// Display KM's banner if position reaches halfpoint in the song
		if (Math.floor(position) === Math.floor(playerState.duration / 2) && !displayingInfo && playerState.mediaType === 'song') displayInfo(8000);
		const conf = getConfig();
		// Stop poll if position reaches 10 seconds before end of song
		if (Math.floor(position) >= Math.floor(playerState.duration - 10) && playerState.mediaType === 'song' &&
		conf.Karaoke.Poll.Enabled &&
		!songNearEnd) {
			songNearEnd = true;
			endPoll();
		}
	});
	logger.debug('[Player] mpv initialized successfully');
	playerState.ready = true;
	return true;
}

export async function play(mediadata: MediaData) {
	const conf = getConfig();
	logger.debug('[Player] Play event triggered');
	playerState.playing = true;
	//Search for media file in the different Pathmedias
	let mediaFile: string;
	let subFile: string;
	try {
		mediaFile = await resolveFileInDirs(mediadata.media, conf.System.Path.Medias);
	} catch (err) {
		logger.debug(`[Player] Error while resolving media path : ${err}`);
		logger.warn(`[Player] Media NOT FOUND : ${mediadata.media}`);
		if (conf.System.Path.MediasHTTP) {
			mediaFile = `${conf.System.Path.MediasHTTP}/${encodeURIComponent(mediadata.media)}`;
			logger.info(`[Player] Trying to play media directly from the configured http source : ${conf.System.Path.MediasHTTP}`);
		} else {
			throw `No media source for ${mediadata.media} (tried in ${conf.System.Path.Medias.toString()} and HTTP source)`;
		}
	}
	try {
		if (mediadata.subfile !== 'dummy.ass') subFile = await resolveFileInDirs(mediadata.subfile, conf.System.Path.Lyrics);
	} catch(err) {
		logger.debug(`[Player] Error while resolving subs path : ${err}`);
		logger.warn(`[Player] Subs NOT FOUND : ${mediadata.subfile}`);
	}
	logger.debug(`[Player] Audio gain adjustment : ${mediadata.gain}`);
	logger.debug(`[Player] Loading media : ${mediaFile}`);
	try {
		let options = [];
		options.push(`replaygain-fallback=${mediadata.gain}`) ;

		if (mediaFile.endsWith('.mp3')) {
			// Lavfi-complex argument to have cool visualizations on top of an image during mp3 playback
			// Courtesy of @nah :)
			if (conf.Player.VisualizationEffects) {
				if (mediadata.avatar && conf.Karaoke.Display.Avatar) {
					options.push(`lavfi-complex=[aid1]asplit[ao][a]; [a]showcqt=axis=0[vis];[vis]scale=1920:1080[visu];[vid1]scale=-2:1080[vidInp];[vidInp]pad=1920:1080:(ow-iw)/2:(oh-ih)/2[vpoc];[vpoc][visu]blend=shortest=0:all_mode=overlay:all_opacity=1[ovrl];movie=\\'${mediadata.avatar.replace(/\\/g,'/')}\\'[logo];[logo][ovrl]scale2ref=w=(ih*.128):h=(ih*.128)[logo1][base];[base][logo1]overlay=x='if(between(t,0,8)+between(t,${mediadata.duration - 7},${mediadata.duration}),W-(W*29/300),NAN)':y=H-(H*29/200)[vo]`);
				} else {
					options.push('lavfi-complex=[aid1]asplit[ao][a]; [a]showcqt=axis=0[vis];[vis]scale=1920:1080[visu];[vid1]scale=-2:1080[vidInp];[vidInp]pad=1920:1080:(ow-iw)/2:(oh-ih)/2[vpoc];[vpoc][visu]blend=shortest=0:all_mode=overlay:all_opacity=1[vo]');
				}
			}
			const id3tags = await getID3(mediaFile);
			if (!id3tags.image) {
				const defaultImageFile = resolve(getState().appPath,conf.System.Path.Temp,'default.jpg');
				options.push(`external-file=${defaultImageFile.replace(/\\/g,'/')}`);
				options.push('force-window=yes');
				options.push('image-display-duration=inf');
				options.push('vid=1');
			}
		} else {
			// If video, display avatar if it's defined.
			// Again, lavfi-complex expert @nah comes to the rescue!
			if (mediadata.avatar && conf.Karaoke.Display.Avatar) options.push(`lavfi-complex=movie=\\'${mediadata.avatar.replace(/\\/g,'/')}\\'[logo];[logo][vid1]scale2ref=w=(ih*.128):h=(ih*.128)[logo1][base];[base][logo1]overlay=x='if(between(t,0,8)+between(t,${mediadata.duration - 7},${mediadata.duration}),W-(W*29/300),NAN)':y=H-(H*29/200)[vo]`);
		}
		await retry(async () => load(mediaFile, 'replace', options), {
			retries: 3,
			onFailedAttempt: error => {
				logger.warn(`[Player] Failed to play song, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`);
			}
		});
		playerState.mediaType = 'song';
		await player.play();
		if (monitorEnabled) {
			playerMonitor.play();
			playerMonitor.mute();
		}
		playerState.playerstatus = 'play';
		if (subFile) try {
			let subs = [player.addSubtitles(subFile)];
			if (monitorEnabled) subs.push(playerMonitor.addSubtitles(subFile));
			await Promise.all(subs);
		} catch(err) {
			logger.error(`[Player] Unable to load subtitles : ${JSON.stringify(err)}`);
			throw err;
		}
		// Displaying infos about current song on screen.
		displaySongInfo(mediadata.infos);
		playerState.currentSongInfos = mediadata.infos;
		playerState._playing = true;
		emitPlayerState();
		songNearEnd = false;
	} catch(err) {
		logger.error(`[Player] Error loading media ${mediadata.media} : ${JSON.stringify(err)}`);
		throw err;
	}
}

export function setFullscreen(fsState: boolean): boolean {
	playerState.fullscreen = fsState;
	fsState ? player.fullscreen() : player.leaveFullscreen();
	return playerState.fullscreen;
}

export function toggleOnTop(): boolean {
	playerState.stayontop = !playerState.stayontop;
	player.command('keypress',['T']);
	return playerState.stayontop;
}

export function stop(): PlayerState {
	// on stop do not trigger onEnd event
	// => setting internal playing = false prevent this behavior
	logger.debug('[Player] Stop event triggered');
	playerState.playing = false;
	playerState.timeposition = 0;
	playerState._playing = false;
	playerState.playerstatus = 'stop';
	loadBackground();
	displayInfo();
	setState({player: playerState});
	return playerState;
}

export function pause(): PlayerState {
	logger.debug('[Player] Pause event triggered');
	player.pause();
	if (monitorEnabled) playerMonitor.pause();
	playerState.status = 'pause';
	setState({player: playerState});
	return playerState;
}

export function resume(): PlayerState {
	logger.debug('[Player] Resume event triggered');
	player.play();
	if (monitorEnabled) playerMonitor.play();
	playerState.playing = true;
	playerState._playing = true;
	playerState.playerstatus = 'play';
	setState({player: playerState});
	return playerState;
}

export function seek(delta: number) {
	if (monitorEnabled) playerMonitor.seek(delta);
	return player.seek(delta);
}

export function goTo(pos: number) {
	if (monitorEnabled) playerMonitor.goToPosition(pos);
	return player.goToPosition(pos);
}

export function mute() {
	return player.mute();
}

export function unmute() {
	return player.unmute();
}

export function setVolume(volume: number): PlayerState {
	playerState.volume = volume;
	player.volume(volume);
	setState({player: playerState});
	return playerState;
}

export function hideSubs(): PlayerState {
	player.hideSubtitles();
	if (monitorEnabled) playerMonitor.hideSubtitles();
	playerState.showsubs = false;
	setState({player: playerState});
	return playerState;
}

export function showSubs(): PlayerState {
	player.showSubtitles();
	if (monitorEnabled) playerMonitor.showSubtitles();
	playerState.showsubs = true;
	setState({player: playerState});
	return playerState;
}

export async function message(message: string, duration: number = 10000) {
	if (!getState().player.ready) throw 'Player is not ready yet!';
	logger.info(`[Player] I have a message from another time... : ${message}`);
	const command = {
		command: [
			'expand-properties',
			'show-text',
			'${osd-ass-cc/0}{\\an5}'+message,
			duration,
		]
	};
	player.freeCommand(JSON.stringify(command));
	if (monitorEnabled) playerMonitor.freeCommand(JSON.stringify(command));
	if (playerState.playing === false) {
		await sleep(duration);
		displayInfo();
	}
}

export async function displaySongInfo(infos: string) {
	displayingInfo = true;
	const command = {
		command: [
			'expand-properties',
			'show-text',
			'${osd-ass-cc/0}{\\an1}'+infos,
			8000,
		]
	};
	player.freeCommand(JSON.stringify(command));
	if (monitorEnabled) playerMonitor.freeCommand(JSON.stringify(command));
	await sleep(8000);
	displayingInfo = false;
}

export function displayInfo(duration: number = 10000000) {
	const conf = getConfig();
	const ci = conf.Karaoke.Display.ConnectionInfo;
	let text = '';
	if (ci.Enabled) text = `${ci.Message} ${i18n.__('GO_TO')} ${getState().osURL} !`;
	const version = `Karaoke Mugen ${getState().version.number} (${getState().version.name}) - http://karaokes.moe`;
	const message = '{\\fscx80}{\\fscy80}'+text+'\\N{\\fscx70}{\\fscy70}{\\i1}'+version+'{\\i0}';
	const command = {
		command: [
			'expand-properties',
			'show-text',
			'${osd-ass-cc/0}{\\an1}'+message,
			duration,
		]
	};
	player.freeCommand(JSON.stringify(command));
	if (monitorEnabled) playerMonitor.freeCommand(JSON.stringify(command));
}

export async function restartmpv() {
	await quitmpv();
	logger.debug('[Player] Stopped mpv (restarting)');
	emitPlayerState();
	await startmpv();
	logger.debug('[Player] Restarted mpv');
	emitPlayerState();
}

export async function quitmpv() {
	logger.debug('[Player] Quitting mpv');
	await player.quit();
	// Destroy mpv instance.
	if (playerMonitor) await playerMonitor.quit();
	playerState.ready = false;
}

export async function playJingle() {
	playerState.playing = true;
	playerState.mediaType = 'jingle';
	const jingle = getSingleJingle();
	if (jingle) {
		try {
			logger.debug(`[Player] Playing jingle ${jingle.file}`);
			const options = [`replaygain-fallback=${jingle.gain}`];
			await retry(async () => load(jingle.file, 'replace', options), {
				retries: 3,
				onFailedAttempt: error => {
					logger.warn(`[Player] Failed to play song, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`);
				}
			});
			await player.play();
			if (monitorEnabled) await playerMonitor.play();
			displayInfo();
			playerState.playerstatus = 'play';
			playerState._playing = true;
			emitPlayerState();
		} catch(err) {
			logger.error(`[Player] Unable to load jingle file ${jingle.file} : ${JSON.stringify(err)}`);
			throw Error(err);
		}
	} else {
		logger.debug('[Jingles] No jingle to play.');
		playerState.playerstatus = 'play';
		loadBackground();
		displayInfo();
		playerState._playing = true;
		emitPlayerState();
	}
}

async function load(file: string, mode: string, options: string[]) {
	try {
		await player.load(file, mode, options);
	} catch(err) {
		logger.error(`[mpv] Error loading file ${file} : ${JSON.stringify(err)}`);
		throw Error(err);
	}
	if (monitorEnabled) try {
		await playerMonitor.load(file, mode, options);
	} catch(err) {
		logger.error(`[mpv Monitor] Error loading file ${file} : ${err}`);
		throw Error(err);
	}
}