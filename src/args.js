import {setConfig} from './_utils/config';
import logger from 'winston';
import { setState } from './_utils/state';

const help = `Usage :

karaokemugen [options]

Options :
--help        Displays this message
--version     Displays version info
--debug       Displays additional debug messages
--sql         Traces SQL query at the debug log level
--generate    Generates a new database then quits
--validate    Validates kara files and modify them if needed (no generation)
--strict      Generation/validation only. Strict mode, returns an error if the .kara had to be modified.
--profiling   Displays profiling information for some functions
--test        Launches in test mode (for running unit tests)
--reset       Reset user data (WARNING! Backup your base first!)
--demo        Launches in demo mode (no admin panel, no password changes)
--config file Specify a config file to use (default is config.ini)
--updateBase  Update karaoke base files
--noBaseCheck Disable data file checking
--noBrowser   Do not open a browser window upon launch
--noMedia     (generation only) Do not try to fetch data from media files
`;

export async function parseCommandLineArgs(argv) {
	if (argv.help) {
		console.log(help);
		process.exit(0);
	}
	if (argv.sql) {
		logger.info('[Launcher] SQL queries will be logged');
		setState({opt: {sql: true}});
	}
	if (argv.debug) {
		logger.info('[Launcher] Debug messages enabled on console');
		process.env['NODE_ENV'] = 'development';
	}
	if (argv.validate) {
		logger.info('[Launcher] Validation (no generation) requested');
		setConfig({optValidate: true});
	}
	if (argv.reset) {
		logger.warn('[Launcher] USER DATA IS GOING TO BE RESET');
		setConfig({optReset: true});
	}
	if (argv.version) {
		// Version number is already displayed so we exit here.
		process.exit(0);
	}
	if (argv.profiling) {
		logger.info('[Launcher] Profiling enabled');
		setConfig({optProfiling: true});
	}
	if (argv.generate) {
		logger.info('[Launcher] Database generation requested');
		setConfig({optGenerateDB: true});
		if (argv.noMedia) {
			logger.info('[Launcher] Medias will not be read during generation');
			setConfig({optNoMedia: true});
		}
	}
	if (argv.noBaseCheck) {
		logger.info('[Launcher] Data files will not be checked. ENABLED AT YOUR OWN RISK');
		setConfig({optNoBaseCheck: true});
	}
	if (argv.strict) {
		logger.info('[Launcher] Strict mode enabled. KARAOKE MUGEN DOES NOT FORGIVE. EVER.');
		setConfig({optStrict: true});
	}
	if (argv.updateBase) {
		logger.info('[Launcher] Base update requested');
		setConfig({optBaseUpdate: true});
	}
	if (argv.test) {
		logger.info('[Launcher] TEST MODE ENABLED. DO NOT DO THIS AT HOME.');
		setConfig({isTest: true});
	}
	if (argv.demo) {
		logger.info('[Launcher] Demo mode enabled');
		setConfig({isDemo: true});
	}
	if (argv.noBrowser) setConfig({optNoBrowser: true});
}


