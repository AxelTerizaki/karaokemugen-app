import {db, transaction} from '../lib/dao/database';
import { DownloadedStatus } from '../lib/types/database/download';
import logger from '../lib/utils/logger';
import { DBDownload } from '../types/database/download';
import { KaraDownload } from '../types/download';
import { sqldeleteDoneFailedDownloads, sqlemptyDownload, sqlinsertDownload, sqlselectDownloads, sqlselectPendingDownloads, sqlsetDownloaded, sqlsetDownloadedAK, sqlupdateDownloadStatus, sqlupdateRunningDownloads } from './sql/download';

export async function updateDownloaded(kids: string[], value: DownloadedStatus) {
	let query = sqlsetDownloaded;
	let queryAK = sqlsetDownloadedAK;
	const values: any = [value];
	if (kids.length > 0) {
		query += 'WHERE pk_kid = ANY ($2)';
		queryAK += 'WHERE pk_kid = ANY ($2)';
		values.push(kids);
	}
	await Promise.all([
		db().query(query, values),
		db().query(queryAK, values)
	]);
}

export function insertDownloads(downloads: KaraDownload[] ) {
	const dls = downloads.map(dl => [
		dl.name,
		dl.size,
		'DL_PLANNED',
		dl.uuid,
		dl.repository,
		dl.mediafile,
		dl.kid
	]);
	logger.debug('Running transaction', {service: 'Download DAO'});
	return transaction({sql: sqlinsertDownload, params: dls});
}

export async function selectDownloads(): Promise<DBDownload[]> {
	const dls = await db().query(sqlselectDownloads);
	return dls.rows;
}

export async function selectPendingDownloads(): Promise<DBDownload[]> {
	const dls = await db().query(sqlselectPendingDownloads);
	return dls.rows;
}

export async function initDownloads() {
	await db().query(sqlupdateRunningDownloads);
	await db().query(sqldeleteDoneFailedDownloads);
}

export function updateDownload(uuid: string, status: string) {
	return db().query(sqlupdateDownloadStatus, [
		status,
		uuid
	]);
}

export function emptyDownload() {
	return db().query(sqlemptyDownload);
}