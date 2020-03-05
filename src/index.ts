// KM Imports
import {asyncCheckOrMkdir, asyncReadDir, asyncExists, asyncRemove,  asyncCopyAlt} from './lib/utils/files';
import {getConfig, setConfig, resolvedPathTemp, resolvedPathAvatars} from './lib/utils/config';
import {initConfig} from './utils/config';
import {parseCommandLineArgs} from './args';
import logger, { configureLogger } from './lib/utils/logger';
import {exit, initEngine} from './services/engine';
import {logo} from './logo';
import { setState, getState } from './utils/state';
import { version } from './version';

// Types
import {Config} from './types/config';

// Node modules
import {copy, moveSync} from 'fs-extra';
import {mkdirSync, existsSync} from 'fs';
import {join, resolve} from 'path';
import minimist from 'minimist';
import chalk from 'chalk';
import {createInterface} from 'readline';
import { getPortPromise } from 'portfinder';
import cloneDeep from 'lodash.clonedeep';
import { createCircleAvatar } from './utils/imageProcessing';

process.on('uncaughtException', exception => {
	console.log('Uncaught exception:', exception);
});

process.on('unhandledRejection', (error) => {
	console.log('Unhandled Rejection at:', error);
});

process.on('SIGINT', () => {
	exit('SIGINT');
});

process.on('SIGTERM', () => {
	exit('SIGTERM');
});

// CTRL+C for Windows :

if (process.platform === 'win32' ) {
	const rl = createInterface({
	  input: process.stdin,
	  output: process.stdout
	});

	rl.on('SIGINT', () => {
	  exit('SIGINT');
	});
}

// Main app begins here.
// Testing if we're in a packaged version of KM or not.
const appPath = ('pkg' in process)
	? join(process['execPath'], '../')
	: join(__dirname, '../');

let dataPath = resolve(appPath, 'app/');

// Testing if we're in portable mode or not
if (!existsSync(resolve(appPath, 'portable'))) {
	// Rewriting dataPath to point to user home directory
	dataPath = resolve(process.env.HOME, 'KaraokeMugen/');
}

if (!existsSync(dataPath)) mkdirSync(dataPath);

// Move config file if it's in appPath to dataPath
if (existsSync(resolve(appPath, 'config.yml')) && !existsSync(resolve(dataPath, 'config.yml'))) {
	moveSync(resolve(appPath, 'config.yml'), resolve(dataPath, 'config.yml'));
}
if (existsSync(resolve(appPath, 'database.json')) && !existsSync(resolve(dataPath, 'database.json'))) {
	moveSync(resolve(appPath, 'database.json'), resolve(dataPath, 'database.json'));
}

setState({appPath: appPath, dataPath: dataPath});

process.env['NODE_ENV'] = 'production'; // Default

main()
	.catch(err => {
		logger.error(`[Launcher] Error during launch : ${err}`);
		console.log(err);
		exit(1);
	});

async function main() {
	const argv = minimist(process.argv.slice(2));
	setState({ os: process.platform, version: version });
	const state = getState();
	console.log(chalk.blue(logo));
	console.log('Karaoke Player & Manager - http://karaokes.moe');
	console.log(`Version ${chalk.bold.green(state.version.number)} (${chalk.bold.green(state.version.name)})`);
	console.log('================================================================================');
	await configureLogger(dataPath, !!argv.debug, true);
	await initConfig(argv);
	let config = getConfig();
	const publicConfig = cloneDeep(getConfig());
	publicConfig.Karaoke.StreamerMode.Twitch.OAuth = 'xxxxx';
	publicConfig.App.JwtSecret = 'xxxxx';
	publicConfig.App.InstanceID = 'xxxxx';
	await parseCommandLineArgs(argv);
	logger.debug(`[Launcher] AppPath : ${appPath}`);
	logger.debug(`[Launcher] DataPath : ${dataPath}`);
	logger.debug(`[Launcher] Locale : ${state.EngineDefaultLocale}`);
	logger.debug(`[Launcher] OS : ${state.os}`);
	logger.debug(`[Launcher] Loaded configuration : ${JSON.stringify(publicConfig, null, 2)}`);
	logger.debug(`[Launcher] Initial state : ${JSON.stringify(state, null, 2)}`);

	// Checking paths, create them if needed.
	await checkPaths(config);

	// Copying files from the app's sources to the app's working folder.
	// This is an ugly hack : we could use fs.copy but due to a bug in pkg,
	// using a writeFile/readFile combination is making it work with recent versions
	// of pkg, thus allowing us to build for Node 10
	// See https://github.com/zeit/pkg/issues/420

	// Copy the input.conf file to modify mpv's default behaviour, namely with mouse scroll wheel
	const tempInput = resolve(resolvedPathTemp(), 'input.conf');
	logger.debug(`[Launcher] Copying input.conf to ${tempInput}`);
	await asyncCopyAlt(join(__dirname, '../assets/input.conf'), tempInput);

	const tempBackground = resolve(resolvedPathTemp(), 'default.jpg');
	logger.debug(`[Launcher] Copying default background to ${tempBackground}`);
	await asyncCopyAlt(join(__dirname, `../assets/${state.version.image}`), tempBackground);

	// Copy avatar blank.png if it doesn't exist to the avatar path
	logger.debug(`[Launcher] Copying blank.png to ${resolvedPathAvatars()}`);
	await asyncCopyAlt(join(__dirname, '../assets/blank.png'), resolve(resolvedPathAvatars(), 'blank.png'));
	createCircleAvatar(resolve(resolvedPathAvatars(), 'blank.png'));

	/**
	 * Test if network ports are available
	 */
	verifyOpenPort(getConfig().Frontend.Port, getConfig().App.FirstRun);

	/**
	 * Gentlemen, start your engines.
	 */
	try {
		await initEngine();
	} catch(err) {
		console.log(err);
		logger.error(`[Launcher] Karaoke Mugen initialization failed : ${err}`);
		exit(1);
	}
}

/**
 * Checking if application paths exist.
 */
async function checkPaths(config: Config) {

	const appPath = getState().appPath;
	const dataPath = getState().dataPath;
	// If no karaoke is found, copy the samples directory if it exists
	if (!await asyncExists(resolve(dataPath, 'data'))) {
		try {
			await asyncReadDir(resolve(appPath, 'samples'));
			logger.debug('[Launcher] Kara files are missing - copying samples');
			await copy(
				resolve(appPath, 'samples'),
				resolve(dataPath, 'data')
			);
		} catch(err) {
			logger.warn('[Launcher] No samples directory found, will not copy them.');
		}
	}

	// Emptying temp directory
	if (await asyncExists(resolvedPathTemp())) await asyncRemove(resolvedPathTemp());
	// Checking paths
	let checks = [];
	const paths = config.System.Path;
	for (const item of Object.keys(paths)) {
		Array.isArray(paths[item])
			? paths[item].forEach((dir: string) => checks.push(asyncCheckOrMkdir(resolve(dataPath, dir))))
			: checks.push(asyncCheckOrMkdir(resolve(dataPath, paths[item])));
	}
	checks.push(asyncCheckOrMkdir(resolve(dataPath, 'logs/')));
	await Promise.all(checks);
	logger.debug('[Launcher] Directory checks complete');
}

async function verifyOpenPort(portConfig: number, firstRun: boolean) {
	try {
		const port = await getPortPromise({
			port: portConfig,
			stopPort: 7331
		});
		if (firstRun && port !== portConfig) {
			logger.warn(`[Launcher] Port ${portConfig} is already in use. Switching to ${port} and saving configuration`);
			setConfig({Frontend: {Port: port}});
		}
	} catch(err) {
		throw 'Failed to find a free port to use';
	}
}
