import { promises as fs } from 'fs';
import { copy } from 'fs-extra';
import { basename, resolve } from 'path';

import { getStoreChecksum, removeKaraInStore } from '../dao/dataStore';
import { addKara, deleteKara as deleteKaraDB, selectAllKaras, updateKara } from '../dao/kara';
import { getPlaylistKaraIDs } from '../dao/playlist';
import { updateKaraTags } from '../dao/tag';
import { saveSetting } from '../lib/dao/database';
import { refreshKaras, refreshKarasDelete, refreshKarasInsert, refreshKarasUpdate, refreshYears, updateKaraSearchVector } from '../lib/dao/kara';
import { getDataFromKaraFile, parseKara, writeKara } from '../lib/dao/karafile';
import { refreshTags, updateTagSearchVector} from '../lib/dao/tag';
import { writeTagFile } from '../lib/dao/tagfile';
import { Kara, KaraTag } from '../lib/types/kara';
import { getConfig, resolvedPathRepos } from '../lib/utils/config';
import { getTagTypeName, tagTypes } from '../lib/utils/constants';
import { resolveFileInDirs } from '../lib/utils/files';
import logger, { profile } from '../lib/utils/logger';
import { createImagePreviews } from '../lib/utils/previews';
import Task from '../lib/utils/taskManager';
import { emitWS } from '../lib/utils/ws';
import sentry from '../utils/sentry';
import { getState } from '../utils/state';
import { generateBlacklist } from './blacklist';
import { checkMediaAndDownload } from './download';
import {getKara, getKaras} from './kara';
import { editKara } from './karaCreation';
import { getRepo, getRepos } from './repo';
import { getTag } from './tag';

export async function updateTags(kara: Kara) {
	const tagsAndTypes = [];
	for (const type of Object.keys(tagTypes)) {
		if (kara[type]) for (const tag of kara[type]) {
			// We can have either a name or a number for type
			tagsAndTypes.push({tid: tag.tid, type: tagTypes[type] || type});
		}
	}
	await updateKaraTags(kara.kid, tagsAndTypes);
}

export async function createKaraInDB(kara: Kara, opts = {refresh: true}) {
	await addKara(kara);
	emitWS('statsRefresh');
	await updateTags(kara);
	if (opts.refresh) {
		await refreshKarasAfterDBChange('ADD', [kara.kid], true);
		generateBlacklist();
	}
}

export async function editKaraInDB(kara: Kara, opts = {
	refresh: true
}) {
	profile('editKaraDB');
	const promises = [updateKara(kara)];
	if (kara.newTags) promises.push(updateTags(kara));
	await Promise.all(promises);
	if (opts.refresh) {
		await refreshKarasAfterDBChange('UPDATE', [kara.kid], kara.newTags);
		generateBlacklist();
	}
	profile('editKaraDB');
}

export async function deleteKara(kids: string[], refresh = true, deleteFiles = {media: true, kara: true}) {
	const karas = await selectAllKaras({
		q: `k:${kids.join(',')}`,
	});
	if (karas.length === 0) throw {code: 404, msg: `Unknown kara IDs in ${kids.join(',')}`};
	for (const kara of karas) {
		// Remove files
		if (kara.download_status === 'DOWNLOADED' && deleteFiles.media) {
			try {
				await fs.unlink((await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository)))[0]);
			} catch(err) {
				logger.warn(`Non fatal: Removing mediafile ${kara.mediafile} failed`, {service: 'Kara', obj: err});
			}
		}
		if (deleteFiles.kara) {
			try {
				await fs.unlink((await resolveFileInDirs(kara.karafile, resolvedPathRepos('Karaokes', kara.repository)))[0]);
			} catch(err) {
				logger.warn(`Non fatal: Removing karafile ${kara.karafile} failed`, {service: 'Kara', obj: err});
			}
			if (kara.subfile) try {
				await fs.unlink((await resolveFileInDirs(kara.subfile, resolvedPathRepos('Lyrics', kara.repository)))[0]);
			} catch(err) {
				logger.warn(`Non fatal: Removing subfile ${kara.subfile} failed`, {service: 'Kara', obj: err});
			}
		}
		logger.info(`Song files of ${kara.karafile} removed`, {service: 'Kara'});
	}
	for (const kara of karas) {
		removeKaraInStore(kara.kid);
	}
	saveSetting('baseChecksum', getStoreChecksum());
	// Remove kara from database
	await deleteKaraDB(karas.map(k => k.kid));
	emitWS('statsRefresh');
	if (refresh) {
		await refreshKarasDelete(karas.map(k => k.kid));
		refreshTags();
		refreshYears();
		generateBlacklist();
	}
}


export async function copyKaraToRepo(kid: string, repoName: string) {
	try {
		const kara = await getKara(kid, {role: 'admin', username: 'admin'});
		if (!kara) throw {code: 404};
		const repo = getRepo(repoName);
		if (!repo) throw {code: 404};
		const oldRepoName = kara.repository;
		kara.repository = repoName;
		const tasks = [];
		// Determine repository indexes so we know if we should edit our current database to change the kara's repository inside
		// Repositories are ordered by priority so if destination repo is lower, we don't edit the song in database.
		const repos = getRepos();
		const oldRepoIndex = repos.findIndex(r => r.Name === oldRepoName);
		const newRepoIndex = repos.findIndex(r => r.Name === repoName);
		// If the new repo has priority, edit kara so the database uses it.
		if (newRepoIndex < oldRepoIndex) tasks.push(editKara(kara));
		tasks.push(writeKara(resolve(resolvedPathRepos('Karaokes', repoName)[0], kara.karafile), kara));
		const mediaFiles = await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', oldRepoName));
		tasks.push(copy(
			mediaFiles[0],
			resolve(resolvedPathRepos('Medias', repoName)[0], kara.mediafile),
			{ overwrite: true }
		));
		const lyricsFiles = await resolveFileInDirs(kara.subfile, resolvedPathRepos('Lyrics', oldRepoName));
		tasks.push(copy(
			lyricsFiles[0],
			resolve(resolvedPathRepos('Lyrics', repoName)[0], kara.subfile),
			{ overwrite: true }
		));
		for (const tid of kara.tid) {
			const tag = await getTag(tid.split('~')[0]);
			// If for some reason tag couldn't be found, continue.
			if (!tag) continue;
			// Modify tag file we just copied to change its repo
			tag.repository = repoName;
			tag.modified_at = new Date().toISOString();
			tasks.push(writeTagFile(tag, resolvedPathRepos('Tags', repoName)[0]));
		}
		await Promise.all(tasks);
	} catch(err) {
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	}
}

export async function batchEditKaras(plaid: string, action: 'add' | 'remove', tid: string, type: number) {
	// Checks
	const task = new Task({
		text: 'EDITING_KARAS_BATCH_TAGS',
	});
	try {
		type = +type;
		const tagType = getTagTypeName(type);
		if (!tagType) throw 'Type unknown';
		const pl = await getPlaylistKaraIDs(plaid);
		if (pl.length === 0) throw 'Playlist unknown or empty';
		task.update({
			value: 0,
			total: pl.length
		});
		if (action !== 'add' && action !== 'remove') throw 'Unkown action';
		const tag = await getTag(tid);
		if (!tag) throw 'Unknown tag';
		logger.info(`Batch tag edit starting : adding ${tid} in type ${type} for all songs in playlist ${plaid}`, {service: 'Kara'});
		for (const plc of pl) {
			const kara = await getKara(plc.kid, {username: 'admin', role: 'admin'});
			if (!kara) {
				logger.warn(`Batch tag edit : kara ${plc.kid} unknown. Ignoring.`, {service: 'Kara'});
				continue;
			}
			task.update({
				subtext: kara.karafile
			});
			let modified = false;
			if (kara[tagType].length > 0 && action === 'remove') {
				if (kara[tagType].find((t: KaraTag) => t.tid === tid)) modified = true;
				kara[tagType] = kara[tagType].filter((t: KaraTag) => t.tid !== tid);
			}
			if (action === 'add' && !kara[tagType].find((t: KaraTag) => t.tid === tid)) {
				modified = true;
				kara[tagType].push(tag);
			}
			if (modified) {
				await editKara(kara, false);
			} else {
				logger.info(`Batch edit tag : skipping ${kara.karafile} since no actions taken`, {service: 'Kara'});
			}
			task.incr();
		}
		await refreshKaras();
		refreshTags();
		refreshYears();
		logger.info('Batch tag edit finished', {service: 'Kara'});
	} catch(err) {
		logger.info('Batch tag edit failed', {service: 'Kara', obj: err});
	} finally {
		task.end();
	}
}

export async function refreshKarasAfterDBChange(action: 'ADD' | 'UPDATE' | 'DELETE' | 'ALL' = 'ALL', kids?: string[], newTags?: boolean) {
	profile('RefreshAfterDBChange');
	logger.debug('Refreshing DB after kara change', {service: 'DB'});
	await updateKaraSearchVector(kids);
	if (action === 'ADD') {
		await refreshKarasInsert(kids);
	} else if (action === 'UPDATE') {
		await refreshKarasUpdate(kids);
	} else if (action === 'DELETE') {
		await refreshKarasDelete(kids);
	} else if (action === 'ALL') {
		await refreshKaras();
	}
	refreshYears();
	if (newTags) {
		await updateTagSearchVector();
		refreshTags();
	}
	logger.debug('Done refreshing DB after kara change', {service: 'DB'});
	profile('RefreshAfterDBChange');
}

export async function integrateKaraFile(file: string, deleteOldFiles = true): Promise<string> {
	const karaFileData = await parseKara(file);
	const karaFile = basename(file);
	const karaData = await getDataFromKaraFile(karaFile, karaFileData, {media: true, lyrics: true});
	const karaDB = await getKara(karaData.kid, {role: 'admin', username: 'admin'});
	const mediaDownload = getRepo(karaData.repository).AutoMediaDownloads;
	if (karaDB) {
		await editKaraInDB(karaData, { refresh: false });
		if (deleteOldFiles) {
			try {
				const oldKaraFile = (await resolveFileInDirs(karaDB.karafile, resolvedPathRepos('Karaokes', karaDB.repository)))[0];
				if (karaDB.karafile !== karaData.karafile) {
					await fs.unlink(oldKaraFile);
				}
			} catch(err) {
				logger.warn(`Failed to remove ${karaDB.karafile}, does it still exist?`, {service: 'Kara'});
			}
			if (karaDB.mediafile !== karaData.mediafile && karaDB.download_status === 'DOWNLOADED') try {
				await fs.unlink((await resolveFileInDirs(karaDB.mediafile, resolvedPathRepos('Medias', karaDB.repository)))[0]);
			} catch(err) {
				logger.warn(`Failed to remove ${karaDB.mediafile}, does it still exist?`, {service: 'Kara'});
			}
			if (karaDB.subfile && karaDB.subfile !== karaData.subfile) try {
				await fs.unlink((await resolveFileInDirs(karaDB.subfile, resolvedPathRepos('Lyrics', karaDB.repository)))[0]);
			} catch(err) {
				logger.warn(`Failed to remove ${karaDB.subfile}, does it still exist?`, {service: 'Kara'});
			}
		}
		if (mediaDownload !== 'none') {
			checkMediaAndDownload(karaData.kid, karaData.mediafile, karaData.repository, karaData.mediasize, mediaDownload === 'updateOnly');
		}
	} else {
		await createKaraInDB(karaData, { refresh: false });
		if (mediaDownload === 'all') {
			checkMediaAndDownload(karaData.kid, karaData.mediafile, karaData.repository, karaData.mediasize);
		}
	}
	// Do not create image previews if running this from the command line.
	if (!getState().opt.generateDB && getConfig().Frontend.GeneratePreviews) createImagePreviews(await getKaras({q: `k:${karaData.kid}`}), 'single');
	return karaData.kid;
}

export async function deleteMediaFile(file: string, repo: string) {
	// Just to make sure someone doesn't send a full path file
	const mediaFile = basename(file);
	const mediaPaths = await resolveFileInDirs(mediaFile, resolvedPathRepos('Medias', repo));
	await fs.unlink(mediaPaths[0]);
}
