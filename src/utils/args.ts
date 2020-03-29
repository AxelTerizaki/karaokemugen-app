import {setState} from './state';
import logger, { enableProfiling } from '../lib/utils/logger';
import { CommandLine } from 'electron';

export async function parseCommandLineArgs(argv: any, cmdline: CommandLine) {
	if ((cmdline && cmdline.hasSwitch('sql')) || argv.sql) {
		logger.info('[Launcher] SQL queries will be logged');
		setState({opt: {sql: true}});
	}
	if ((cmdline && cmdline.hasSwitch('debug')) || argv.debug) {
		logger.info('[Launcher] Debug messages enabled on console');
		setState({opt: {debug: true}});
		process.env['NODE_ENV'] = 'development';
	}
	if ((cmdline && cmdline.hasSwitch('validate')) || argv.validate) {
		logger.info('[Launcher] Validation (no generation) requested');
		setState({opt: {validate: true}});
	}
	if ((cmdline && cmdline.hasSwitch('reset')) || argv.reset) {
		logger.warn('[Launcher] USER DATA IS GOING TO BE RESET');
		setState({opt: {reset: true}});
	}
	if ((cmdline && cmdline.hasSwitch('profiling')) || argv.profiling) {
		logger.info('[Launcher] Profiling enabled');
		enableProfiling();
	}
	if ((cmdline && cmdline.hasSwitch('generate')) || argv.generate) {
		logger.info('[Launcher] Database generation requested');
		setState({opt: {generateDB: true}});
	}
	if ((cmdline && cmdline.hasSwitch('noMedia')) || argv.noMedia) {
		logger.info('[Launcher] Medias will not be read during generation');
		setState({opt: {noMedia: true}});
	}
	if ((cmdline && cmdline.hasSwitch('noBaseCheck')) || argv.noBaseCheck) {
		logger.info('[Launcher] Data files will not be checked. ENABLED AT YOUR OWN RISK');
		setState({opt: {noBaseCheck: true}});
	}
	if ((cmdline && cmdline.hasSwitch('noPlayer')) || argv.noPlayer) {
		logger.info('[Launcher] Player will not start.');
		setState({opt: {noPlayer: true}});
	}
	if ((cmdline && cmdline.hasSwitch('strict')) || argv.strict) {
		logger.info('[Launcher] Strict mode enabled. KARAOKE MUGEN DOES NOT FORGIVE. EVER.');
		setState({opt: {strict: true}});
	}
	if ((cmdline && cmdline.hasSwitch('updateBase')) || argv.updateBase) {
		logger.info('[Launcher] Base update requested');
		setState({opt: {baseUpdate: true}});
	}
	if ((cmdline && cmdline.hasSwitch('updateMedias')) || argv.updateMedias) {
		logger.info('[Launcher] Media update requested');
		setState({opt: {mediaUpdate: true}});
	}
	if ((cmdline && cmdline.hasSwitch('test')) || argv.test) {
		logger.info('[Launcher] TEST MODE ENABLED. DO NOT DO THIS AT HOME.');
		setState({isTest: true});
	}
	if ((cmdline && cmdline.hasSwitch('demo')) || argv.demo) {
		logger.info('[Launcher] Demo mode enabled');
		setState({isDemo: true});
	}
	if ((cmdline && cmdline.hasSwitch('noBrowser')) || argv.noBrowser) setState({opt: {noBrowser: true}});
	if ((cmdline && cmdline.getSwitchValue('forceAdminpassword')) || argv.forceAdminPassword) setState({opt: {forceAdminPassword: argv.forceAdminPassword || cmdline.getSwitchValue('forceAdminPassword')}});
	if ((cmdline && cmdline.hasSwitch('dumpDB')) || argv.dumpDB) setState({opt: {dumpDB: true}});
	if ((cmdline && cmdline.hasSwitch('restoreDB')) || argv.restoreDB) setState({opt: {restoreDB: true}});
}