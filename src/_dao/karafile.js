/**
 * Tools used to manipulate .kara files : reading, extracting info, etc.
 * These functions do not resolve paths. Arguments should be resolved already.
 */

import {now} from '../_utils/date';
import uuidV4 from 'uuid/v4';
import logger from 'winston';
import {basename, extname, resolve} from 'path';
import {parse as parseini, stringify} from 'ini';
import {checksum, asyncReadFile, asyncStat, asyncWriteFile, resolveFileInDirs, asyncUnlink} from '../_utils/files';
import {resolvedPathKaras, resolvedPathSubs, resolvedPathTemp, resolvedPathMedias} from '../_utils/config';
import {extractSubtitles, getMediaInfo} from '../_utils/ffmpeg';
import {createKaraInDB, editKaraInDB, formatKara} from '../_services/kara';
import {getConfig} from '../_utils/config';
import {getKara, selectAllKaras} from './kara';
import {getState} from '../_utils/state';

let error = false;

function strictModeError(karaData, data) {
	delete karaData.ass;
	logger.error(`[Kara] STRICT MODE ERROR : ${data} - Kara data read : ${JSON.stringify(karaData,null,2)}`);
	error = true;
}

export async function integrateKaraFile(file) {
	const karaData = await getDataFromKaraFile(file);
	karaData.karafile = basename(file);
	const karaDB = await getKara(karaData.KID, {username: 'admin', role: 'admin'});
	if (karaDB.length > 0) {
		await editKaraInDB(karaData);
		if (karaDB[0].karafile !== karaData.karafile) await asyncUnlink(await resolveFileInDirs(karaDB[0].karafile, getConfig().PathKaras.split('|')));
		if (karaDB[0].mediafile !== karaData.mediafile) await asyncUnlink(await resolveFileInDirs(karaDB[0].mediafile, getConfig().PathMedias.split('|')));
		if (karaDB[0].subfile !== 'dummy.ass' && karaDB[0].subfile !== karaData.subfile) await asyncUnlink(await resolveFileInDirs(karaDB[0].subfile, getConfig().PathSubs.split('|')));
	} else {
		await createKaraInDB(karaData);
	}
}

export async function getDataFromKaraFile(karafile) {
	const state = getState();
	const karaData = await parseKara(karafile);

	karaData.error = false;
	karaData.isKaraModified = false;

	if (!karaData.KID) {
		karaData.isKaraModified = true;
		karaData.KID = uuidV4();
		if (state.opt.strict) strictModeError(karaData, 'kid is missing');
	}
	if (!karaData.dateadded) {
		karaData.isKaraModified = true;
		karaData.dateadded = now(true);
		if (state.opt.strict) strictModeError(karaData, 'dateadded is missing');
	}
	if (!karaData.datemodif) {
		karaData.isKaraModified = true;
		karaData.datemodif = now(true);
		if (state.opt.strict) strictModeError(karaData, 'datemodif is missing');
	}
	karaData.karafile = karafile;
	let mediaFile;
	try {
		mediaFile = await resolveFileInDirs(karaData.mediafile, resolvedPathMedias());
	} catch (err) {
		logger.debug(`[Kara] Media file not found : ${karaData.mediafile}`);
		if (state.opt.strict) strictModeError(karaData, 'mediafile');
		if (!karaData.mediagain) karaData.mediagain = 0;
		if (!karaData.mediasize) karaData.mediasize = 0;
		if (!karaData.mediaduration) karaData.mediaduration = 0;
		karaData.ass = '';
	}

	if (mediaFile || state.opt.noMedia) {
		const subFile = await findSubFile(mediaFile, karaData);
		await extractAssInfos(subFile, karaData);
		await extractMediaTechInfos(mediaFile, karaData);
	}

	if (error) karaData.error = true;

	return karaData;
}

export async function extractAssInfos(subFile, karaData) {
	if (subFile) {
		karaData.ass = await asyncReadFile(subFile, {encoding: 'utf8'});
		karaData.ass = karaData.ass.replace(/\r/g, '');
		const subChecksum = checksum(karaData.ass);
		if (subChecksum !== karaData.subchecksum) {
			karaData.isKaraModified = true;
			karaData.subchecksum = subChecksum;
			if (getState().opt.strict) strictModeError(karaData, 'subchecksum is missing or invalid');
		}
	} else {
		karaData.ass = '';
	}
	return karaData;
}

export async function extractMediaTechInfos(mediaFile, karaData) {
	if (!getState().opt.noMedia) {
		let mediaStats;
		try {
			mediaStats = await asyncStat(mediaFile);
		} catch(err) {
			// Return early if file isn't found
			if (getState().opt.strict) strictModeError(karaData, `Media file "${mediaFile} not found`);
			return;
		}
		if (mediaStats.size !== +karaData.mediasize) {
			karaData.isKaraModified = true;
			karaData.mediasize = mediaStats.size;

			const mediaData = await getMediaInfo(mediaFile);
			if (mediaData.error && getState().opt.strict) strictModeError(karaData, 'ffmpeg failed');

			karaData.mediagain = mediaData.audiogain;
			karaData.mediaduration = mediaData.duration;
			if (getState().opt.strict) strictModeError(karaData, 'mediasize/gain/duration are invalid');
		}
	}
}

export async function writeKara(karafile, karaData) {
	const infosToWrite = (formatKara(karaData));
	if (karaData.isKaraModified === false) {
		return;
	}
	infosToWrite.datemodif = now(true);
	delete infosToWrite.karafile;
	karaData.datemodif = infosToWrite.datemodif;
	await asyncWriteFile(karafile, stringify(infosToWrite));
}

export async function parseKara(karaFile) {
	let data = await asyncReadFile(karaFile, 'utf-8');
	data = data.replace(/\r/g, '');
	return parseini(data);
}

export async function extractVideoSubtitles(videoFile, kid) {
	const extractFile = resolve(resolvedPathTemp(), `kara_extract.${kid}.ass`);
	try {
		await extractSubtitles(videoFile, extractFile);
		return extractFile;
	} catch (err) {
		throw err;
	}
}

async function findSubFile(videoFile, kara) {
	if (kara.subfile === '' && !getState().opt.noMedia) {
		if (extname(videoFile) === '.mkv') {
			try {
				return await extractVideoSubtitles(videoFile, kara.KID);
			} catch (err) {
				// Not blocking.
				logger.warn(`[Kara] Could not extract subtitles from video file ${videoFile}`);
				if (getState().opt.strict) strictModeError(kara, 'extracting subtitles failed');
			}
		}
	} else {
		try {
			if (kara.subfile !== 'dummy.ass') return await resolveFileInDirs(kara.subfile, resolvedPathSubs());
		} catch (err) {
			logger.warn(`[Kara] Could not find subfile '${kara.subfile}' (in ${JSON.stringify(resolvedPathSubs())}).`);
			if (getState().opt.strict) strictModeError(kara, `subfile ${kara.subfile} not found`);
		}
	}
	// Non-blocking case if file isn't found
	return '';
}

export async function replaceSerieInKaras(oldSerie, newSerie) {
	logger.info(`[Kara] Replacing serie "${oldSerie}" by "${newSerie}" in .kara files`);
	const karas = await selectAllKaras(null, null, null, null, null, true);
	let karasWithSerie = [];
	for (const kara of karas) {
		if (kara.serie_orig && kara.serie_orig.split(',').includes(oldSerie)) karasWithSerie.push(kara.karafile);
	}
	if (karasWithSerie.length > 0) logger.info(`[Kara] Replacing in ${karasWithSerie.length} files`);
	for (const karaFile of karasWithSerie) {
		logger.info(`[Kara] Replacing in ${karaFile}...`);
		const karaPath = await resolveFileInDirs(karaFile, resolvedPathKaras());
		const kara = await parseKara(karaPath);
		let series = kara.series.split(',');
		const index = series.indexOf(oldSerie);
		if (index > -1)	series[index] = newSerie;
		kara.series = series.join(',');
		kara.isKaraModified = true;
		await writeKara(karaPath, kara);
	}
}

export async function removeSerieInKaras(serie) {
	logger.info(`[Kara] Removing serie ${serie} in .kara files`);
	const karas = await selectAllKaras(null, null, null, null, null, true);
	let karasWithSerie = [];
	for (const kara of karas) {
		if (kara.serie_orig && kara.serie_orig.split(',').includes(serie)) karasWithSerie.push(kara.karafile);
	}
	if (karasWithSerie.length > 0) logger.info(`[Kara] Removing in ${karasWithSerie.length} files`);
	for (const karaFile of karasWithSerie) {
		logger.info(`[Kara] Removing in ${karaFile}...`);
		const karaPath = await resolveFileInDirs(karaFile, resolvedPathKaras());
		const kara = await parseKara(karaPath);
		const series = kara.series.split(',');
		const newSeries = series.filter(s => s !== serie);
		kara.series = newSeries.join(',');
		kara.isKaraModified = true;
		await writeKara(karaPath, kara);
	}
}