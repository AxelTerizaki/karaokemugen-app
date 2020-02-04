import {selectDownloadBLC, truncateDownloadBLC, insertDownloadBLC,  deleteDownloadBLC, emptyDownload, selectDownload, selectDownloads, updateDownload, deleteDownload, insertDownloads, selectPendingDownloads, initDownloads} from '../dao/download';
import Downloader from '../utils/downloader';
import Queue from 'better-queue';
import uuidV4 from 'uuid/v4';
import {resolvedPathTemp, resolvedPathRepos, getConfig} from '../lib/utils/config';
import {resolve} from 'path';
import internet from 'internet-available';
import logger from '../lib/utils/logger';
import {asyncMove, resolveFileInDirs, asyncStat, asyncUnlink, asyncReadDir, asyncWriteFile} from '../lib/utils/files';
import {uuidRegexp, getTagTypeName} from '../lib/utils/constants';
import {integrateKaraFile, getAllKaras, getKaras} from './kara';
import {integrateSeriesFile} from './series';
import { compareKarasChecksum } from '../dao/database';
import { vacuum } from '../lib/dao/database';
import { emitWS } from '../lib/utils/ws';
import got from 'got';
import { QueueStatus, KaraDownload, KaraDownloadRequest, KaraDownloadBLC, File } from '../types/download';
import { DownloadItem } from '../types/downloader';
import { KaraList, KaraParams, CompareParam } from '../lib/types/kara';
import { TagParams, Tag } from '../lib/types/tag';
import { deleteKara } from '../services/kara';
import { refreshAll } from '../lib/dao/database';
import { DBKara } from '../lib/types/database/kara';
import { getTags, integrateTagFile } from './tag';
import prettyBytes from 'pretty-bytes';
import { refreshKaras } from '../lib/dao/kara';
import merge from 'lodash.merge';
import { DownloadBundle } from '../lib/types/downloads';

const queueOptions = {
	id: 'uuid',
	precondition: (cb: any) => {
		internet()
			.then(cb(null, true))
			.catch(cb(null, false));
	},
	preconditionRetryTimeout: 10 * 1000,
	cancelIfRunning: true
};

let q: any;

function emitQueueStatus(status: QueueStatus) {
	emitWS('downloadQueueStatus', status);
}

function queueDownload(input: KaraDownload, done: any) {
	logger.info(`[Download] Processing song : ${input.name}`);
	processDownload(input)
		.then(() => done())
		.catch(err => done(err));
}

export async function initDownloader() {
	initQueue();
	await initDownloads();
	await startDownloads();
	return;
}


function initQueue(drainEvent = true) {
	// We'll compare data dir checksum and execute refresh every 5 downloads and everytime the queue is drained
	let taskCounter = 0;
	q = new Queue(queueDownload, queueOptions);
	q.on('task_finish', () => {
		if (q.length > 0) logger.info(`[Download] ${q.length - 1} items left in queue`);
		taskCounter++;
		if (taskCounter >= 100) {
			logger.debug('[Download] Triggering database refresh');
			compareKarasChecksum(true);
			refreshAll();
			taskCounter = 0;
		}
		emitQueueStatus('updated');
	});
	q.on('task_failed', (taskId: string, err: any) => {
		logger.error(`[Download] Task ${taskId} failed : ${err}`);
		emitQueueStatus('updated');
	});
	q.on('empty', () => emitQueueStatus('updated'));
	if (drainEvent) q.on('drain', () => {
		logger.info('[Download] No tasks left, stopping queue');
		refreshAll().then(() => vacuum());
		compareKarasChecksum();
		taskCounter = 0;
		emitQueueStatus('updated');
		emitQueueStatus('stopped');
	});
}

export async function startDownloads() {
	if (q.length && q.length > 0) {
		resumeQueue();
	} else {
		const downloads = await selectPendingDownloads();
		try {
			await internet();
			downloads.forEach(dl => q.push(dl));
			logger.info('[Downloader] Download queue starting up');
			emitQueueStatus('started');
		} catch(err) {
			if (downloads.length > 0) logger.warn('[Download] There are planned downloads, but your computer seems offline');
			emitQueueStatus('stopped');
		}
	}
}

async function processDownload(download: KaraDownload) {
	try {
		await setDownloadStatus(download.uuid, 'DL_RUNNING');
		let list = [];
		const localMedia = resolve(resolvedPathRepos('Medias', download.repository)[0], download.urls.media.local);
		const localKaraPath = resolve(resolvedPathRepos('Karas', download.repository)[0]);
		const localSeriesPath = resolve(resolvedPathRepos('Series', download.repository)[0]);
		const localTagsPath = resolve(resolvedPathRepos('Tags', download.repository)[0]);
		const localLyricsPath = resolve(resolvedPathRepos('Lyrics', download.repository)[0]);

		const conf = getConfig();
		const res = await got.get(`https://${conf.Online.Host}/api/karas/${download.kid}/raw`);
		const bundle: DownloadBundle = JSON.parse(res.body);

		const tempDir = resolvedPathTemp();
		const tempMedia = resolve(tempDir, download.urls.media.local);

		// Check if media already exists in any media dir. If it does, do not try to redownload it.
		let mediaAlreadyExists = false;
		try {
			const existingMediaFiles = await resolveFileInDirs(download.urls.media.local, resolvedPathRepos('Medias', download.repository));
			// Check if file size are different
			const localMediaStat = await asyncStat(existingMediaFiles[0]);
			if (localMediaStat.size !== download.size) throw null;
			mediaAlreadyExists = true;
		} catch(err) {
			// File does not exist or sizes are different, we download it.
			list.push({
				filename: tempMedia,
				url: download.urls.media.remote,
				id: download.name
			});
		}
		await downloadFiles(download, list);

		const writes = [];
		let tempLyrics: string;
		if (bundle.lyrics.file !== null) {
			tempLyrics = resolve(tempDir, bundle.lyrics.file);
			writes.push(await asyncWriteFile(tempLyrics, bundle.lyrics.data, 'utf-8'));
		};
		const tempKara = resolve(tempDir, bundle.kara.file);
		writes.push(await asyncWriteFile(tempKara, bundle.kara.data, 'utf-8'));

		for (const serie of bundle.series) {
			const tempSeries = resolve(tempDir, serie.file);
			writes.push(await asyncWriteFile(tempSeries, serie.data, 'utf-8'));
		}
		for (const tag of bundle.tags) {
			const tempTag = resolve(tempDir, tag.file);
			writes.push(await asyncWriteFile(tempTag, tag.data, 'utf-8'));
		}

		// Delete files if they're already present
		try {
			if (!mediaAlreadyExists) await asyncMove(tempMedia, localMedia, {overwrite: true});
		} catch(err) {
			logger.error(`[Debug] Unable to move ${tempMedia} to ${localMedia}`);
		}
		try {
			if (bundle.lyrics.file !== null) await asyncMove(tempLyrics, resolve(localLyricsPath, bundle.lyrics.file), {overwrite: true});
		} catch(err) {
			logger.error(`[Debug] Unable to move ${tempLyrics} to ${localLyricsPath}`);
		}
		try {
			await asyncMove(tempKara, resolve(localKaraPath, bundle.kara.file), {overwrite: true});
		} catch(err) {
			logger.error(`[Debug] Unable to move ${tempKara} to ${localKaraPath}`);
		}
		for (const serie of bundle.series) {
			try {
				await asyncMove(resolve(tempDir, serie.file), resolve(localSeriesPath, serie.file), {overwrite: true});
			} catch(err) {
				logger.error(`[Debug] Unable to move ${resolve(tempDir, serie.file)} to ${resolve(localSeriesPath, serie.file)}`);
			}
		}
		for (const tag of bundle.tags) {
			try {
				await asyncMove(resolve(tempDir, tag.file), resolve(localTagsPath, tag.file), {overwrite: true});
			} catch(err) {
				logger.error(`[Debug] Unable to move ${resolve(tempDir, tag.file)} to ${resolve(localTagsPath, tag.file)}`);
			}
		}
		logger.info(`[Download] Finished downloading "${download.name}"`);
		// Now adding our newly downloaded kara
		try {
			for (const serie of bundle.series) {
				try {
					const serieName = await integrateSeriesFile(resolve(localSeriesPath, serie.file));
					logger.debug(`[Download] Series "${serieName}" in database`);
				} catch(err) {
					logger.error(`[Download] Series "${serie.file}" not properly added to database`);
					throw err;
				}
			}
			for (const tag of bundle.tags) {
				try {
					const tagName = await integrateTagFile(resolve(localTagsPath, tag.file));
					logger.debug(`[Download] Tag "${tagName}" in database`);
				} catch(err) {
					logger.error(`[Download] Tag "${tag.file}" not properly added to database`);
					throw err;
				}
			}
			try {
				await integrateKaraFile(resolve(localKaraPath, bundle.kara.file));
				logger.info(`[Download] Song "${download.name}" added to database`);
				await setDownloadStatus(download.uuid, 'DL_DONE');
			} catch(err) {
				logger.error(`[Download] Song "${download.name}" not properly added to database`);
				throw err;
			}
		} catch(err) {
			logger.error(`[Download] Song "${download.name}" downloaded but not properly added to database. Regenerate your database manually after fixing errors`);
			throw err;
		}
	} catch(err) {
		setDownloadStatus(download.uuid, 'DL_FAILED');
		throw err;
	}
}

async function downloadFiles(download: KaraDownload, list: DownloadItem[]) {
	const downloader = new Downloader({ bar: true });
	// Launch downloads
	return new Promise((resolve, reject) => {
		downloader.download(list)
			.then(fileErrors => {
				if (fileErrors.length > 0) {
					setDownloadStatus(download.uuid, 'DL_FAILED')
						.then(() => {
							reject(`Error downloading file : ${fileErrors.toString()}`);
						}).catch(err => {
							reject(`Error downloading file : ${fileErrors.toString()} - setting failed status failed too! (${err})`);
						});
				} else {
					resolve();
				}
			});
	});
}

export function pauseQueue() {
	// Queue is paused but the current running task is not paused.
	emitQueueStatus('paused');
	return q.pause();
}

export function resumeQueue() {
	emitQueueStatus('started');
	return q.resume();
}

export async function addDownloads(downloads: KaraDownloadRequest[]): Promise<string> {
	const currentDls = await getDownloads();
	downloads = downloads.filter(dl => {
		if (currentDls.find(cdl => dl.name === cdl.name &&
			(cdl.status === 'DL_RUNNING' ||
			cdl.status === 'DL_PLANNED')
		)
		) return false;
		return true;
	});
	if (downloads.length === 0) throw 'No downloads added, all are already in queue or running';
	const dls: KaraDownload[] = downloads.map(dl => {
		return {
			uuid: uuidV4(),
			urls: {
				media: {
					remote: `https://${dl.repository}/downloads/medias/${dl.mediafile}`,
					local: dl.mediafile
				},
			},
			name: dl.name,
			size: dl.size,
			kid: dl.kid,
			status: 'DL_PLANNED',
			repository: dl.repository
		};
	});
	await insertDownloads(dls);
	dls.forEach(dl => q.push(dl));
	return `${dls.length} download(s) queued`;
}

export async function getDownloads() {
	return await selectDownloads();
}

export async function getDownload(uuid: string) {
	return await selectDownload(uuid);
}

export async function setDownloadStatus(uuid: string, status: string) {
	return await updateDownload(uuid, status);
}

export async function retryDownload(uuid: string) {
	const dl = await selectDownload(uuid);
	if (!dl) throw 'Download ID unknown';
	if (dl.status === 'DL_RUNNING') throw 'Download is already running!';
	if (dl.status === 'DL_PLANNED') throw 'Download is already planned!';
	await setDownloadStatus(uuid, 'DL_PLANNED');
	q.push(dl);
	emitQueueStatus('started');
}

export async function removeDownload(uuid: string) {
	const dl = await selectDownload(uuid);
	if (!dl) throw 'Download ID unknown';
	if (dl.status === 'DL_RUNNING' ) throw 'Running downloads cannot be cancelled';
	await deleteDownload(uuid);
	q.cancel(uuid);
	emitQueueStatus('updated');
}

export async function wipeDownloads() {
	q.destroy();
	initQueue();
	emitQueueStatus('stopped');
	return await emptyDownload();
}

export async function getDownloadBLC() {
	return await selectDownloadBLC();
}

export async function addDownloadBLC(blc: KaraDownloadBLC) {
	if (blc.type < 0 && blc.type > 1006) throw `Incorrect BLC type (${blc.type})`;
	if ((blc.type <= 1001) && !new RegExp(uuidRegexp).test(blc.value)) throw `Blacklist criteria value mismatch : type ${blc.type} must have UUID value`;
	if ((blc.type >= 1002) && isNaN(blc.value)) throw `Blacklist criteria type mismatch : type ${blc.type} must have a numeric value!`;
	return await insertDownloadBLC(blc);
}

export async function removeDownloadBLC(id: number) {
	const dlBLC = await selectDownloadBLC();
	if (!dlBLC.some(e => e.dlblc_id === id )) throw 'DL BLC ID does not exist';
	return await deleteDownloadBLC(id);
}

export async function emptyDownloadBLC() {
	return await truncateDownloadBLC();
}

export async function getAllRemoteKaras(repository: string, params: KaraParams, compare?: CompareParam): Promise<KaraList> {
	if (repository) {
		return getRemoteKaras(repository, params, compare);
	} else {
		const repos = getConfig().System.Repositories.filter(r => r.Online);
		const tasks = [];
		for (const repo of repos) {
			tasks.push(getRemoteKaras(repo.Name, params, compare));
		}
		const allKaras: KaraList[] = await Promise.all(tasks);
		// Let's concatenate our stuff here
		const everything: KaraList = {
			content: [],
			infos: {
				count: 0,
				from: 0,
				to: 0
			}
		};
		allKaras.forEach(l => merge(everything, l));
		// To get total count we're going to remove all duplicated by repo to keep only one song from each repo.
		// Each song has a count property which gives us th enumber of songs for that query, so by adding them we get our total maximum count.
		// Remove the :any for k and k2 once KM Server has merged the lib
		everything.infos.count = 0;
		const everythingUnique = everything.content.filter((k: any, i, self) => self.findIndex((k2:any) => k2.repo === k.repo) === i);
		everythingUnique.forEach(k => everything.infos.count = +everything.infos.count + +k.count);
		everything.infos.to = +params.from + +params.size;
		return everything;
	}
}

export async function getRemoteKaras(repo: string, params: KaraParams, compare?: CompareParam): Promise<KaraList> {
	//First get all karas we currently own
	let localKIDs = {};
	const query = params.q
		? `r=${repo}!${params.q}`
		: `r=${repo}`;
	if (compare === 'missing' || compare === 'updated') {
		const karas = await getKaras({
			filter: params.filter,
			token: {username: 'admin', role: 'admin'},
			mode: 'search',
			modeValue: query
		});
		karas.content.forEach(k => localKIDs[k.kid] = k.modified_at);
	}
	const res = await got.post(`https://${repo}/api/karas/search`, {
		json: {
			filter: params.filter,
			size: params.size,
			from: params.from,
			q: params.q || '',
			localKaras: compare ? localKIDs : null,
			compare: compare
		}
	});
	return JSON.parse(res.body);
}

export async function getAllRemoteTags(repository: string, params: TagParams): Promise<Tag[]> {
	if (repository) {
		return getRemoteTags(repository, params);
	} else {
		const repos = getConfig().System.Repositories.filter(r => r.Online);
		const tasks = [];
		repos.forEach(repo => tasks.push(getRemoteTags(repo.Name, params)));
		const allTags: Tag[][] = await Promise.all(tasks);
		// Let's concatenate our stuff here
		const everything = [].concat.apply([], allTags);
		everything.sort((a: Tag, b: Tag) => (a.name > b.name) ? 1 : -1);
		return everything;
	}

}
export async function getRemoteTags(repo: string, params: TagParams): Promise<Tag[]> {
	const queryParams = new URLSearchParams([
		['type', params.type + '']
	]);
	const res = await got(`https://${repo}/api/karas/tags?${queryParams.toString()}`);
	return JSON.parse(res.body);
}

export async function updateAllBases() {
	for (const repo of getConfig().System.Repositories) {
		try {
			if (repo.Online) {
				logger.info(`[Update] Updating base from repository ${repo.Name}`);
				await updateBase(repo.Name);
			}
		} catch(err) {
			logger.warn(`[Update] Repository ${repo.Name} failed to update properly`);
		}
	}
}

export async function updateBase(repo: string) {
	// First, make sure we wipe the download queue before updating.
	if (!q) initQueue(false);
	await emptyDownload();
	logger.info('[Update] Computing songs to add/remove/update...');
	try {
		logger.info('[Update] Getting local and remote song inventory');
		const karas = await getKaraInventory(repo);
		logger.info('[Update] Removing songs...');
		await cleanKaras(repo, karas.local, karas.remote);
		logger.info('[Update] Adding updated/new songs...');
		const [updatedSongs, newSongs] = await Promise.all([
			updateKaras(repo, karas.local, karas.remote),
			downloadKaras(repo, karas.local, karas.remote)
		]);
		if (updatedSongs === 0 && newSongs === 0) return true;
		await waitForUpdateQueueToFinish();
		return true;
	} catch(err) {
		logger.error(`[Update] Base update failed : ${err}`);
		throw err;
	}
}

async function waitForUpdateQueueToFinish() {
	return new Promise((resolve, reject) => {
		// We'll redefine the drain event of the queue to resolve once the queue is drained.
		q.on('drain', () => {
			compareKarasChecksum();
			refreshAll()
				.then(() => {
					vacuum();
					resolve();
				}).catch(err => {
					logger.error(`[Download] Error while draining queue : ${err}`);
					reject();
				});
		});
	});
}
async function getKaraInventory(repo: string) {
	const [local, remote] = await Promise.all([
		getAllKaras(),
		getRemoteKaras(repo, {})
	]);
	local.content = local.content.filter(k => k.repository === repo);
	return {
		local,
		remote
	};
}

export async function downloadAllKaras() {
	for (const repo of getConfig().System.Repositories) {
		try {
			if (repo.Online) {
				logger.info(`[Update] Downloading all songs from repository ${repo.Name}`);
				await downloadKaras(repo.Name);
			}
		} catch(err) {
			logger.warn(`[Update] Repository ${repo.Name} failed to download all songs properly`);
		}
	}
};

export async function downloadKaras(repo: string, local?: KaraList, remote?: KaraList): Promise<number> {
	if (!local || !remote) {
		const karas = await getKaraInventory(repo);
		local = karas.local;
		remote = karas.remote;
	}
	const localKIDs = local.content.map(k => k.kid);
	let karasToAdd = remote.content.filter(k => !localKIDs.includes(k.kid));
	const initialKarasToAddCount = karasToAdd.length;
	// Among those karaokes, we need to establish which ones we'll filter out via the download blacklist criteria
	logger.info('[Update] Applying blacklist (if present)');

	const [blcs, tags] = await Promise.all([
		getDownloadBLC(),
		getTags({})
	]);
	for (const blc of blcs) {
		let filterFunction: Function;
		if (blc.type === 0) filterFunction = filterTagName;
		if (blc.type >= 2 && blc.type < 1000) filterFunction = filterTagID;
		if (blc.type === 1000) filterFunction = filterSeriesName;
		if (blc.type === 1001) filterFunction = filterKID;
		if (blc.type === 1002) filterFunction = filterDurationLonger;
		if (blc.type === 1003) filterFunction = filterDurationShorter;
		if (blc.type === 1004) filterFunction = filterTitle;
		if (blc.type === 1005) filterFunction = filterYearOlder;
		if (blc.type === 1006) filterFunction = filterYearYounger;
		karasToAdd = karasToAdd.filter(k => filterFunction(k, blc.value, blc.type, tags.content));
	}
	const downloads = karasToAdd.map(k => {
		return {
			size: k.mediasize,
			mediafile: k.mediafile,
			kid: k.kid,
			name: k.karafile.replace('.kara.json',''),
			repository: repo
		};
	});
	logger.info(`[Update] Adding ${karasToAdd.length} new songs.`);
	if (initialKarasToAddCount !== karasToAdd.length) logger.info(`[Update] ${initialKarasToAddCount - karasToAdd.length} songs have been blacklisted`);
	if (karasToAdd.length > 0) await addDownloads(downloads);
	return karasToAdd.length;
}

function filterTitle(k: DBKara, value: string): boolean {
	return !k.title.includes(value);
}

function filterTagName(k: DBKara, value: string): boolean {
	return !k.tag_names.includes(value);
}

function filterKID(k: DBKara, value: string): boolean {
	return k.kid !== value;
}

function filterSeriesName(k: DBKara, value: string): boolean {
	return !k.serie.includes(value);
}

function filterTagID(k: DBKara, value: string, type: number, tags: Tag[]): boolean {
	// Find tag
	const tag = tags.find(e => e.tid === value);
	if (tag) {
		let typeName = getTagTypeName(type);
		return k[typeName].every((e: Tag) => !e.tid.includes(tag.tid));
	} else {
		// Tag isn't found in database, weird but could happen for some obscure reasons. We'll return true.
		logger.warn(`[Update] Tag ${value} not found in database when trying to blacklist songs to download, will ignore it.`);
		return true;
	}
}

function filterDurationLonger(k: DBKara, value: string) {
	// Remember we want to return only songs that are no longer than value
	return k.duration <= +value;
}

function filterDurationShorter(k: DBKara, value: string) {
	// Remember we want to return only songs that are no shorter than value
	return k.duration >= +value;
}

function filterYearOlder(k: DBKara, value: string) {
	return k.year <= +value;
}

function filterYearYounger(k: DBKara, value: string) {
	return k.year >= +value;
}

export async function cleanAllKaras() {
	for (const repo of getConfig().System.Repositories) {
		try {
			if (repo.Online) {
				logger.info(`[Update] Cleaning songs not in repository ${repo.Name} anymore`);
				await cleanKaras(repo.Name);
			}
		} catch(err) {
			logger.warn(`[Update] Repository ${repo.Name} failed to clean songs properly`);
		}
	}
}

export async function cleanKaras(repo: string, local?: KaraList, remote?: KaraList) {
	if (!local || !remote) {
		const karas = await getKaraInventory(repo);
		local = karas.local;
		remote = karas.remote;
	}
	const localKIDs = local.content.map(k => k.kid);
	const remoteKIDs = remote.content.map(k => k.kid);
	const karasToRemove = localKIDs.filter(kid => !remoteKIDs.includes(kid));
	// Now we have a list of KIDs to remove
	logger.info(`[Update] Removing ${karasToRemove.length} songs`);
	const promises = [];
	karasToRemove.forEach(kid => promises.push(deleteKara(kid, false)));
	await Promise.all(promises);
	if (karasToRemove.length > 0) {
		compareKarasChecksum(true);
		refreshKaras();
	}
}

export async function updateAllKaras() {
	for (const repo of getConfig().System.Repositories) {
		try {
			if (repo.Online) {
				logger.info(`[Update] Updating all songs from repository ${repo.Name}`);
				await updateKaras(repo.Name);
			}
		} catch(err) {
			logger.warn(`[Update] Repository ${repo.Name} failed to update songs properly`);
		}
	}
}

export async function updateKaras(repo: string, local?: KaraList, remote?: KaraList): Promise<number> {
	logger.info('[Update] Starting update process...');
	if (!local || !remote) {
		const karas = await getKaraInventory(repo);
		local = karas.local;
		remote = karas.remote;
	}
	const karasToUpdate = local.content.filter(k => {
		const rk = remote.content.find(rk => rk.kid === k.kid);
		// When grabbed from the remote API we get a string, while the local API returns a date object. So, well... sorrymasen.
		if (rk && rk.modified_at as unknown > k.modified_at.toISOString()) return true;
	}).map(k => k.kid);
	const downloads = remote.content.filter(k => karasToUpdate.includes(k.kid)).map(k => {
		return {
			size: k.mediasize,
			mediafile: k.mediafile,
			kid: k.kid,
			name: k.karafile.replace('.kara.json',''),
			repository: repo
		};
	});
	logger.info(`[Update] Updating ${karasToUpdate.length} songs`);
	if (karasToUpdate.length > 0) await addDownloads(downloads);
	return karasToUpdate.length;
}

let updateRunning = false;

async function listRemoteMedias(repo: string): Promise<File[]> {
	logger.info('[Update] Fetching current media list');
	emitWS('downloadProgress', {
		text: 'Listing media files to download',
		value: 0,
		total: 100
	});
	emitWS('downloadBatchProgress', {
		text: 'Updating...',
		value: 3,
		total: 5
	});
	const remote = await getRemoteKaras(repo, {});
	return remote.content.map(k => {
		return {
			basename: k.mediafile,
			size: k.mediasize
		};
	});
}

async function compareMedias(localFiles: File[], remoteFiles: File[], repo: string): Promise<boolean> {
	let removedFiles:string[] = [];
	let addedFiles:File[] = [];
	let updatedFiles:File[] = [];
	const mediasPath = resolvedPathRepos('Medias', repo)[0];
	logger.info('[Update] Comparing your medias with the current ones');
	emitWS('downloadProgress', {
		text: 'Comparing your media files with Karaoke Mugen\'s latest files',
		value: 0,
		total: 100
	});
	emitWS('downloadBatchProgress', {
		text: 'Updating...',
		value: 4,
		total: 5
	});
	for (const remoteFile of remoteFiles) {
		const filePresent = localFiles.some(localFile => {
			if (localFile.basename === remoteFile.basename) {
				if (localFile.size !== remoteFile.size) updatedFiles.push(remoteFile);
				return true;
			}
			return false;
		});
		if (!filePresent) addedFiles.push(remoteFile);
	}
	for (const localFile of localFiles) {
		const filePresent = remoteFiles.some(remoteFile => {
			return localFile.basename === remoteFile.basename;
		});
		if (!filePresent) removedFiles.push(localFile.basename);
	}
	// Remove files to update to start over their download
	for (const file of updatedFiles) {
		await asyncUnlink(resolve(mediasPath, file.basename));
	}
	const filesToDownload = addedFiles.concat(updatedFiles);
	if (removedFiles.length > 0) await removeFiles(removedFiles, mediasPath);
	emitWS('downloadProgress', {
		text: 'Comparing your base with Karaoke Mugen\'s latest files',
		value: 100,
		total: 100
	});
	if (filesToDownload.length > 0) {
		filesToDownload.sort((a,b) => {
			return (a.basename > b.basename) ? 1 : ((b.basename > a.basename) ? -1 : 0);
		});
		let bytesToDownload = 0;
		for (const file of filesToDownload) {
			bytesToDownload = bytesToDownload + file.size;
		}
		logger.info(`[Update] Downloading ${filesToDownload.length} new/updated medias (size : ${prettyBytes(bytesToDownload)})`);
		await downloadMedias(filesToDownload, mediasPath, repo);
		logger.info('[Update] Done updating medias');
		return true;
	} else {
		logger.info('[Update] No new medias to download');
		return false;
	}
}

function downloadMedias(files: File[], mediasPath: string, repo: string): Promise<void> {
	let list = [];
	for (const file of files) {
		list.push({
			filename: resolve(mediasPath, file.basename),
			url: `https://${repo}/downloads/medias/${encodeURIComponent(file.basename)}`,
			size: file.size
		});
	}
	const mediaDownloads = new Downloader({
		bar: true
	});
	return new Promise((resolve: any, reject: any) => {
		mediaDownloads.download(list)
			.then((fileErrors) => {
				fileErrors.length > 0
					? reject(`Error downloading these medias : ${fileErrors.toString()}`)
					: resolve();
			});
	});
}

async function listLocalMedias(repo: string): Promise<File[]> {
	const mediaFiles = await asyncReadDir(resolvedPathRepos('Medias', repo)[0]);
	let localMedias = [];
	for (const file of mediaFiles) {
		const mediaPath = resolveFileInDirs(file, resolvedPathRepos('Medias', repo));
		const mediaStats = await asyncStat(mediaPath[0]);
		localMedias.push({
			basename: file,
			size: mediaStats.size
		});
	}
	logger.debug('[Update] Listed local media files');
	return localMedias;
}

async function removeFiles(files: string[], dir: string): Promise<void> {
	for (const file of files) {
		await asyncUnlink(resolve(dir, file));
		logger.info(`[Update] Removed : ${file}`);
	}
}

export async function updateAllMedias() {
	for (const repo of getConfig().System.Repositories) {
		try {
			if (repo.Online) {
				logger.info(`[Update] Updating medias from repository ${repo.Name}`);
				await updateMedias(repo.Name);
			}
		} catch(err) {
			logger.warn(`[Update] Repository ${repo.Name} failed to update medias properly`);
		}
	}
}

export async function updateMedias(repo: string): Promise<boolean> {
	if (updateRunning) throw 'An update is already running, please wait for it to finish.';
	updateRunning = true;
	try {
		const [remoteMedias, localMedias] = await Promise.all([
			listRemoteMedias(repo),
			listLocalMedias(repo)
		]);
		const updateVideos = await compareMedias(localMedias, remoteMedias, repo);

		updateRunning = false;
		emitWS('downloadProgress', {
			text: 'Done',
			value: 100,
			total: 100
		});
		emitWS('downloadBatchProgress', {
			text: 'Update done!',
			value: 100,
			total: 100
		});
		return !!updateVideos;
	} catch (err) {
		emitWS('downloadProgress', {
			text: 'Done',
			value: 100,
			total: 100
		});
		emitWS('downloadBatchProgress', {
			text: 'Update failed!',
			value: 100,
			total: 100
		});
		updateRunning = false;
		throw err;
	}
}
