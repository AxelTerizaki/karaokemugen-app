import {tagTypes} from '../lib/utils/constants';
import {ASSToLyrics} from '../utils/ass';
import {refreshTags, refreshKaraTags} from '../lib/dao/tag';
import {refreshKaraSeriesLang, refreshSeries, refreshKaraSeries} from '../lib/dao/series';
import { saveSetting } from '../lib/dao/database';
import { refreshYears, refreshKaras } from '../lib/dao/kara';
import {selectAllKaras,
	getYears as getYearsDB,
	getKara as getKaraDB,
	getKaraMini as getKaraMiniDB,
	deleteKara as deleteKaraDB,
	getASS,
	addKara,
	updateKara,
	addPlayed,
	getKaraHistory as getKaraHistoryDB,
	selectAllKIDs
} from '../dao/kara';
import {updateKaraSeries} from '../dao/series';
import {updateKaraTags} from '../dao/tag';
import {basename} from 'path';
import {profile} from '../lib/utils/logger';
import {Kara, KaraParams, KaraList, YearList} from '../lib/types/kara';
import {Series} from '../lib/types/series';
import { getOrAddSerieID } from './series';
import {asyncUnlink, resolveFileInDirs} from '../lib/utils/files';
import {resolvedPathMedias, resolvedPathKaras, resolvedPathSubs} from '../lib/utils/config';
import logger from 'winston';
import { editKaraInStore, removeKaraInStore, getStoreChecksum } from '../dao/dataStore';
import { DBKaraHistory } from '../types/database/kara';
import { DBKara, DBKaraBase } from '../lib/types/database/kara';
import {parseKara, getDataFromKaraFile} from '../lib/dao/karafile';
import { isPreviewAvailable } from '../lib/utils/previews';
import { Token } from '../lib/types/user';
import { consolidatei18n } from '../lib/services/kara';

export async function isAllKaras(karas: string[]): Promise<string[]> {
	// Returns an array of unknown karaokes
	// If array is empty, all songs in "karas" are present in database
	const allKaras = await selectAllKIDs();
	return karas.filter(kid => !allKaras.includes(kid));
}

export async function deleteKara(kid: string, refresh = true) {
	const kara = await getKaraMini(kid);
	if (!kara) throw `Unknown kara ID ${kid}`;
	// Remove files
	await deleteKaraDB(kid);
	try {
		await asyncUnlink(await resolveFileInDirs(kara.mediafile, resolvedPathMedias()));
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing mediafile ${kara.mediafile} failed : ${err}`);
	}
	try {
		await asyncUnlink(await resolveFileInDirs(kara.karafile, resolvedPathKaras()));
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing karafile ${kara.karafile} failed : ${err}`);
	}
	if (kara.subfile) try {
		await asyncUnlink(await resolveFileInDirs(kara.subfile, resolvedPathSubs()));
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing subfile ${kara.subfile} failed : ${err}`);
	}

	removeKaraInStore(kara.kid);
	saveSetting('baseChecksum', getStoreChecksum());
	// Remove kara from database
	logger.info(`[Kara] Song ${kara.karafile} removed`);

	if (refresh) delayedDbRefreshViews(2000);
}

let delayedDbRefreshTimeout = null;

export async function delayedDbRefreshViews(ttl = 100) {
	clearTimeout(delayedDbRefreshTimeout);
	delayedDbRefreshTimeout = setTimeout(refreshKarasAfterDBChange, ttl);
}

export async function getKara(kid: string, token: Token, lang?: string): Promise<DBKara> {
	profile('getKaraInfo');
	let kara = await getKaraDB(kid, token.username, lang, token.role);
	if (!kara) throw `Kara ${kid} unknown`;
	const previewfile = await isPreviewAvailable(kara.kid, kara.mediasize);
	if (previewfile) kara.previewfile = previewfile;
	profile('getKaraInfo');
	return kara;
}

export async function getKaraMini(kid: string): Promise<DBKaraBase> {
	return await getKaraMiniDB(kid);
}

export async function getKaraLyrics(kid: string): Promise<string[]> {
	const kara = await getKaraMini(kid);
	if (!kara) throw `Kara ${kid} unknown`;
	if (kara.subfile === 'dummy.ass') return ['Lyrics not available for this song'];
	const ASS = await getASS(kara.subfile);
	if (ASS) return ASSToLyrics(ASS);
	return ['Lyrics not available for this song'];
}

async function updateSeries(kara: Kara) {
	if (!kara.series) return true;
	let lang = 'und';
	if (kara.langs) lang = kara.langs[0].name;
	let sids = [];
	for (const s of kara.series) {
		let langObj = {};
		langObj[lang] = s;
		let seriesObj: Series = {
			name: s
		};
		seriesObj.i18n = {...langObj};
		const sid = await getOrAddSerieID(seriesObj);
		if (sid) sids.push(sid);
	}
	await updateKaraSeries(kara.kid, sids);
}

export async function updateTags(kara: Kara) {
	const tagsAndTypes = [];
	for (const type of Object.keys(tagTypes)) {
		if (kara[type]) for (const tag of kara[type]) {
			tagsAndTypes.push({tid: tag, type: tagTypes[type]});
		}
	}
	await updateKaraTags(kara.kid, tagsAndTypes);
}

export async function createKaraInDB(kara: Kara, opts = {refresh: true}) {
	await addKara(kara);
	await Promise.all([
		updateTags(kara),
		updateSeries(kara)
	]);
	if (opts.refresh) await refreshKarasAfterDBChange();
}

export async function editKaraInDB(kara: Kara, opts = {
	refresh: true
}) {
	await Promise.all([
		updateTags(kara),
		updateSeries(kara),
		updateKara(kara)
	]);
	if (opts.refresh) await refreshKarasAfterDBChange();
}

export async function getKaraHistory(): Promise<DBKaraHistory[]> {
	// Called by system route
	return await getKaraHistoryDB();
}

export async function getTop50(token: Token, lang: string): Promise<DBKara[]> {
	// Called by system route
	return await selectAllKaras({
		username: token.username,
		filter: null,
		lang: lang,
		mode: 'requested'
	});
}

export async function getKaraPlayed(token: Token, lang: string, from: number, size: number): Promise<DBKara[]> {
	// Called by system route
	return await selectAllKaras({
		username: token.username,
		filter: null,
		lang: lang,
		mode: 'played',
		from: from,
		size: size
	});
}

export async function addPlayedKara(kid: string) {
	profile('addPlayed');
	await addPlayed(kid);
	profile('addPlayed');
}

export async function getYears(): Promise<YearList> {
	const years = await getYearsDB();
	return {
		content: years,
		infos: {
			from: 0,
			to: years.length,
			count: years.length
		}
	};
}

export async function getAllKaras(): Promise<KaraList> {
	// Simple function to return all karaokes, compatibility with KM Server
	return await getKaras({from: 0, size: 99999999, token: {username: 'admin', role: 'admin'}});
}

export async function getKaras(params: KaraParams): Promise<KaraList> {
	profile('getKaras');
	const pl = await selectAllKaras({
		username: params.token.username,
		filter: params.filter || '',
		lang: params.lang,
		mode: params.mode,
		modeValue: params.modeValue,
		from: params.from || 0,
		size: params.size || 9999999999,
		admin: params.token.role === 'admin',
		random: params.random
	});
	profile('formatList');
	const ret = formatKaraList(pl.slice(params.from || 0, (params.from || 0) + (params.size || 999999999)), (params.from || 0), pl.length);
	profile('formatList');
	profile('getKaras');
	return ret;
}

export function formatKaraList(karaList: any, from: number, count: number): KaraList {
	// Get i18n from all tags found in all elements, and remove it
	const {i18n, data} = consolidatei18n(karaList);
	return {
		infos: {
			count: count,
			from: from,
			to: from + data.length
		},
		i18n: i18n,
		content: data
	};
}

export async function refreshKarasAfterDBChange() {
	await Promise.all([
		refreshKaraSeries(),
		refreshKaraTags()
	]);
	await refreshKaras();
	refreshSeries();
	refreshKaraSeriesLang();
	refreshYears();
	refreshTags();
}

export async function integrateKaraFile(file: string) {
	const karaFileData = await parseKara(file);
	const karaFile = basename(file);
	const karaData = await getDataFromKaraFile(karaFile, karaFileData)
	const karaDB = await getKaraDB(karaData.kid, 'admin', null, 'admin');
	if (karaDB) {
		await editKaraInDB(karaData, { refresh: false });
		if (karaDB.karafile !== karaData.karafile) await asyncUnlink(await resolveFileInDirs(karaDB.karafile, resolvedPathKaras()));
		if (karaDB.mediafile !== karaData.mediafile) await asyncUnlink(await resolveFileInDirs(karaDB.mediafile, resolvedPathMedias()));
		if (karaDB.subfile && karaDB.subfile !== karaData.subfile) await asyncUnlink(await resolveFileInDirs(karaDB.subfile, resolvedPathSubs()));
	} else {
		await createKaraInDB(karaData, { refresh: false });
	}
	editKaraInStore(karaData.kid, karaFileData);
	saveSetting('baseChecksum', getStoreChecksum());
}