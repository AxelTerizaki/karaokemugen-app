import logger from 'winston';
import {getConfig, setConfig} from '../lib/utils/config';
import {getState} from '../utils/state';
import {exit} from '../services/engine';
import {duration} from '../lib/utils/date';
import {generateDatabase} from '../lib/services/generation';
import DBMigrate from 'db-migrate';
import {join} from 'path';
import {isShutdownPG, initPG} from '../utils/postgresql';
import { baseChecksum } from './dataStore';
import { DBStats } from '../types/database/database';
import { checkUserDBIntegrity } from './generation';
import { getSettings, saveSetting, connectDB, db } from '../lib/dao/database';

const sql = require('./sql/database');


export async function compareKarasChecksum(silent?: boolean): Promise<boolean> {
	logger.info('[DB] Comparing files and database data');
	const [settings, currentChecksum] = await Promise.all([
		getSettings(),
		baseChecksum(silent)
	]);
	if (settings.baseChecksum !== currentChecksum) {
		await saveSetting('baseChecksum', currentChecksum);
		return true;
	}
	if (currentChecksum === null) return undefined;
	return false;
}




export async function initDB() {
	const conf = getConfig();
	await connectDB({superuser: true, db: 'postgres'});
	// Let's grab the database object to modify it.
	let {database} = require('../lib/dao/database');
	database.on('error', (err: any) => {
		// If shutdown is in progress for PG binary, we won't catch errors. (or we'll get connection reset messages spamming console)
		if (!isShutdownPG()) logger.error(`[DB] Database error : ${err}`);
	});
	try {
		await db().query(`CREATE DATABASE ${conf.Database.prod.database} ENCODING 'UTF8'`);
		logger.info('[DB] Database created');
	} catch(err) {
		logger.debug('[DB] Database already exists');
	}
	try {
		await db().query(`CREATE USER ${conf.Database.prod.user} WITH ENCRYPTED PASSWORD '${conf.Database.prod.password}';`);
		logger.info('[DB] User created');
	} catch(err) {
		logger.debug('[DB] User already exists');
	}
	await db().query(`GRANT ALL PRIVILEGES ON DATABASE ${conf.Database.prod.database} TO ${conf.Database.prod.user};`);
	// We need to reconnect to create the extension on our newly created database
	await connectDB({superuser: true, db: conf.Database.prod.database});
	try {
		await db().query('CREATE EXTENSION unaccent;');
	} catch(err) {
		logger.debug('[DB] Extension unaccent already registered');
	}
}

async function migrateDB() {
	logger.info('[DB] Running migrations if needed');
	const conf = getConfig();
	let options = {
		config: conf.Database,
		noPlugins: true,
		plugins: {
			dependencies: {
				'db-migrate': 1,
				'db-migrate-pg': 1
			}
		},
		cmdOptions: {
			'migrations-dir': join(__dirname, '../../migrations/'),
			'log-level': 'warn|error'
		}
	};
	if (getState().opt.debug) options.cmdOptions['log-level'] = 'warn|error|info';
	const dbm = DBMigrate.getInstance(true, options);
	try {
		await dbm.sync('all');
	} catch(err) {
		throw `Migrations failed : ${err}`;
	}
}


export async function initDBSystem(): Promise<boolean> {
	let doGenerate: boolean;
	const conf = getConfig();
	const state = getState();
	if (state.opt.generateDB) doGenerate = true;
	// Only for bundled postgres binary :
	// First login as super user to make sure user, database and extensions are created
	try {
		if (conf.Database.prod.bundledPostgresBinary) {
			await initPG();
			await initDB();
		}
		logger.info('[DB] Initializing database connection');
		await connectDB();
		await migrateDB();
	} catch(err) {
		throw `Database initialization failed. Check if a postgres binary is already running on that port and kill it? Error : ${err}`;
	}
	if (state.opt.reset) await resetUserData();
	if (!state.opt.noBaseCheck) {
		const filesChanged = await compareKarasChecksum();
		if (filesChanged === true) {
			logger.info('[DB] Data files have changed: database generation triggered');
			doGenerate = true;
		}
		// If karasChecksum returns null, it means there were no files to check. We run generation anyway (it'll return an empty database) to avoid making the current startup procedure any more complex.
		if (filesChanged === undefined) doGenerate = true;
	}
	const settings = await getSettings();
	if (!doGenerate && !settings.lastGeneration) {
		setConfig({ App: { FirstRun: true }});
		logger.info('[DB] Database is brand new: database generation triggered');
		doGenerate = true;
	}
	if (doGenerate) try {
		await generateDB();
	} catch(err) {
		logger.error(`[DB] Generation failed : ${err}`);
	}
	logger.debug( '[DB] Database Interface is READY');
	const stats = await getStats();
	logger.info(`Songs        : ${stats.karas} (${duration(+stats.duration)})`);
	logger.info(`Series       : ${stats.series}`);
	logger.info(`Languages    : ${stats.languages}`);
	logger.info(`Artists      : ${stats.singers} singers, ${stats.songwriters} songwriters, ${stats.creators} creators`);
	logger.info(`Kara Authors : ${stats.authors}`);
	logger.info(`Playlists    : ${stats.playlists}`);
	logger.info(`Songs played : ${stats.played}`);
	return true;
}

export async function resetUserData() {
	await db().query(sql.resetUserData);
	logger.warn('[DB] User data has been reset!');
}

export async function getStats(): Promise<DBStats> {
	const res = await db().query(sql.getStats);
	return res.rows[0];
}

export async function generateDB(): Promise<boolean> {
	const state = getState();
	try {
		await generateDatabase(false, true);
		logger.info('[DB] Database generation completed successfully!');
		await checkUserDBIntegrity();
		if (state.opt.generateDB) await exit(0);
	} catch(err) {
		logger.error(`[DB] Database generation completed with errors : ${err}`);
		if (state.opt.generateDB) await exit(1);
	}
	return true;
}
