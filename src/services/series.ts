import {removeSeriesFile, writeSeriesFile, formatSeriesFile} from '../lib/dao/seriesfile';
import {insertSeriei18n, removeSerie, updateSerie, insertSerie, selectSerieByName, selectSerie, selectAllSeries, testSerie} from '../dao/series';
import {refreshSeries, refreshKaraSeries} from '../lib/dao/series';
import {profile} from '../lib/utils/logger';
import logger from 'winston';
import {removeSerieInKaras} from '../lib/dao/karafile';
import uuidV4 from 'uuid/v4';
import { sanitizeFile } from '../lib/utils/files';
import { refreshKaras } from '../lib/dao/kara';
import {Series} from '../lib/types/series';
import { KaraParams } from '../lib/types/kara';
import { removeSeriesInStore, editSeriesInStore, addSeriesToStore, sortSeriesStore, getStoreChecksum } from '../dao/dataStore';
import { saveSetting } from '../lib/dao/database';
import {asyncUnlink, resolveFileInDirs, } from '../lib/utils/files';
import {getConfig, resolvedPathSeries} from '../lib/utils/config';
import {getDataFromSeriesFile} from '../lib/dao/seriesfile';
import { getAllKaras } from './kara';


export async function getSeries(params: KaraParams) {
	profile('getSeries');
	const series = await selectAllSeries(params);
	const ret = formatSeriesList(series.slice(params.from, params.from + params.size), params.from, series.length);
	profile('getSeries');
	return ret;
}

export async function getOrAddSerieID(serieObj: Series) {
	const serie = await selectSerieByName(serieObj.name);
	if (serie) return serie.sid;
	//Series does not exist, create it.
	return await addSerie(serieObj);
}


export function formatSeriesList(seriesList: any[], from: number, count: number) {
	return {
		infos: {
			count: count,
			from: from,
			to: from + seriesList.length
		},
		content: seriesList
	};
}

export async function getSerie(sid: string) {
	const serie = await selectSerie(sid);
	if (!serie) throw 'Series ID unknown';
	return serie;
}

export async function deleteSerie(sid: string) {
	const serie = await testSerie(sid);
	if (!serie) throw 'Series ID unknown';
	await removeSerie(sid);
	await Promise.all([
		refreshSeries(),
		removeSeriesFile(serie.name),
		removeSerieInKaras(serie.name, await getAllKaras()),
	]);
	// Refreshing karas is done asynchronously
	removeSeriesInStore(sid);
	saveSetting('baseChecksum', getStoreChecksum());
	refreshKaraSeries().then(() => refreshKaras());
}

export async function addSerie(serieObj: Series, opts = {refresh: true}): Promise<string> {
	if (serieObj.name.includes(',')) throw 'Commas not allowed in series name';
	const serie = await selectSerieByName(serieObj.name);
	if (serie) {
		logger.warn(`Series original name already exists "${serieObj.name}"`);
		return serie.sid;
	}
	if (!serieObj.sid) serieObj.sid = uuidV4();
	if (!serieObj.seriefile) serieObj.seriefile = `${sanitizeFile(serieObj.name)}.series.json`;
	const seriefile = serieObj.seriefile;

	await insertSerie(serieObj);
	await Promise.all([
		insertSeriei18n(serieObj),
		writeSeriesFile(serieObj, resolvedPathSeries()[0])
	]);

	const seriesData = formatSeriesFile(serieObj).series;
	seriesData.seriefile = seriefile;
	addSeriesToStore(seriesData);
	sortSeriesStore();
	saveSetting('baseChecksum', getStoreChecksum());

	if (opts.refresh) {
		await refreshSeriesAfterDBChange();
	}
	return serieObj.sid;
}

export async function editSerie(sid: string, serieObj: Series, opts = { refresh: true }) {
	if (serieObj.name.includes(',')) throw 'Commas not allowed in series name';
	const oldSerie = await testSerie(sid);
	if (!oldSerie) throw 'Series ID unknown';
	if (oldSerie.name !== serieObj.name) await removeSeriesFile(oldSerie.name);
	serieObj.seriefile = sanitizeFile(serieObj.name) + '.series.json';
	const seriefile = serieObj.seriefile;
	await Promise.all([
		updateSerie(serieObj),
		writeSeriesFile(serieObj, resolvedPathSeries()[0])
	]);
	const seriesData = formatSeriesFile(serieObj).series;
	seriesData.seriefile = seriefile;
	editSeriesInStore(sid, seriesData);
	saveSetting('baseChecksum', getStoreChecksum());
	if (opts.refresh) {
		await refreshSeriesAfterDBChange();
	}
}

export async function refreshSeriesAfterDBChange() {
	await refreshSeries();
	refreshKaraSeries().then(() => refreshKaras());
}

export async function integrateSeriesFile(file: string): Promise<string> {
	const seriesFileData = await getDataFromSeriesFile(file);
	try {
		const seriesDBData = await testSerie(seriesFileData.sid);
		if (seriesDBData) {
			await editSerie(seriesFileData.sid, seriesFileData, { refresh: false });
			if (seriesDBData.name !== seriesFileData.name) try {
					await asyncUnlink(await resolveFileInDirs(seriesDBData.seriefile, getConfig().System.Path.Series));
				} catch(err) {
					logger.warn(`[Series] Could not remove old series file ${seriesDBData.seriefile}`);
				}
			return seriesFileData.name;
		} else {
			await addSerie(seriesFileData, { refresh: false });
			return seriesFileData.name;
		}
	} catch(err) {
		logger.error(`[Series] Error integrating series file "${file} : ${err}`);
	}
}
