/**
 * Tools used to manipulate .kara files : reading, extracting info, etc.
 * These functions do not resolve paths. Arguments should be resolved already.
 */

import timestamp from 'unix-timestamp';
import uuidV4 from 'uuid/v4';
import logger from 'winston';
import {parse, extname, resolve} from 'path';
import {parse as parseini, stringify} from 'ini';
import {checksum, asyncReadFile, asyncStat, asyncWriteFile, resolveFileInDirs} from '../_common/utils/files';
import {resolvedPathKaras, resolvedPathSubs, resolvedPathTemp, resolvedPathMedias} from '../_common/utils/config';
import {extractSubtitles, getMediaInfo} from '../_common/utils/ffmpeg';
import {formatKara} from '../_services/kara';
import {getConfig} from '../_common/utils/config';
import {getAllKaras} from './kara';

let error = false;

export function karaFilenameInfos(karaFile) {
	const karaFileName = parse(karaFile).name;
	const infos = karaFileName.split(/\s+-\s+/); // LANGUAGE - SERIES - TYPE+ORDER - TITLE

	if (infos.length < 3) {
		throw `Kara filename "${karaFileName} does not respect naming convention`;
	}
	// Adding in 5th position the number extracted from the type field.
	const orderInfos = infos[2].match(/^([a-zA-Z0-9 ]{2,30}?)(\d*)$/);
	infos.push(orderInfos[2] ? +orderInfos[2] : 0);

	// Let's return an object with our data correctly positionned.
	return {
		lang: infos[0].toLowerCase(),
		serie: infos[1],
		type: orderInfos[1],
		order: orderInfos[2] ? +orderInfos[2] : 0,
		title: infos[3] || ''
	};
}

function strictModeError(karaData, data) {
	delete karaData.ass;
	logger.error(`[Kara] STRICT MODE ERROR : One kara's ${data} is going to be modified : ${JSON.stringify(karaData,null,2)}`);
	error = true;
}

export async function getDataFromKaraFile(karafile) {
	const conf = getConfig();
	const karaData = await parseKara(karafile);

	karaData.error = false;
	karaData.isKaraModified = false;

	if (!karaData.KID) {
		karaData.isKaraModified = true;
		karaData.KID = uuidV4();
		if (conf.optStrict) strictModeError(karaData, 'kid');
	}
	timestamp.round = true;
	if (!karaData.dateadded) {
		karaData.isKaraModified = true;
		karaData.dateadded = timestamp.now();
		if (conf.optStrict) strictModeError(karaData, 'dateadded');
	}
	if (!karaData.datemodif) {
		karaData.isKaraModified = true;
		karaData.datemodif = timestamp.now();
		if (conf.optStrict) strictModeError(karaData, 'datemodif');
	}
	karaData.karafile = karafile;

	let mediaFile;

	try {
		mediaFile = await resolveFileInDirs(karaData.mediafile, resolvedPathMedias());
	} catch (err) {
		logger.debug('[Kara] Media file not found : ' + karaData.mediafile);
		if (conf.optStrict) strictModeError(karaData, 'mediafile');
		if (!karaData.mediagain) karaData.mediagain = 0;
		if (!karaData.mediasize) karaData.mediasize = 0;
		if (!karaData.mediaduration) karaData.mediaduration = 0;
		karaData.ass = '';
	}

	if (mediaFile || getConfig().optNoMedia) {
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
			if (getConfig().optStrict) strictModeError(karaData, 'subchecksum');
		}
	} else {
		karaData.ass = '';
	}
	return karaData;
}

export async function extractMediaTechInfos(mediaFile, karaData) {
	const conf = getConfig();
	if (!conf.optNoMedia) {
		const mediaStats = await asyncStat(mediaFile);
		if (mediaStats.size !== +karaData.mediasize) {
			karaData.isKaraModified = true;
			karaData.mediasize = mediaStats.size;

			const mediaData = await getMediaInfo(mediaFile);
			if (mediaData.error && conf.optStrict) strictModeError(karaData, 'ffmpeg return code');

			karaData.mediagain = mediaData.audiogain;
			karaData.mediaduration = mediaData.duration;
			if (conf.optStrict) strictModeError(karaData, 'mediasize/gain/duration');
		}
	}
}

export async function writeKara(karafile, karaData) {
	const infosToWrite = (formatKara(karaData));
	if (karaData.isKaraModified === false) {
		return;
	}
	infosToWrite.datemodif = timestamp.now();
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
	const conf = getConfig();
	if (kara.subfile === '' && !conf.optNoMedia) {
		if (extname(videoFile) === '.mkv') {
			try {
				return await extractVideoSubtitles(videoFile, kara.KID);
			} catch (err) {
				// Not blocking.
				logger.warn(`[Kara] Could not extract subtitles from video file ${videoFile}`);
				if (conf.optStrict) strictModeError(kara, 'extracting subtitles');
			}
		}
	} else {
		try {
			if (kara.subfile !== 'dummy.ass') return await resolveFileInDirs(kara.subfile, resolvedPathSubs());
		} catch (err) {
			logger.warn(`[Kara] Could not find subfile '${kara.subfile}' (in ${JSON.stringify(resolvedPathSubs())}).`);
			if (conf.optStrict) strictModeError(kara, 'subfile');
		}
	}
	// Non-blocking case if file isn't found
	return '';
}

export async function replaceSerieInKaras(oldSerie, newSerie) {
	logger.info(`[Kara] Replacing serie "${oldSerie}" by "${newSerie}" in .kara files`);
	const karas = await getAllKaras('admin');
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
	const karas = await getAllKaras('admin');
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