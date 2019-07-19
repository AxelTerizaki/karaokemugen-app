import {emptyBlacklistCriterias as emptyBLC,
	isBLCriteria as isBLC,
	deleteBlacklistCriteria as deleteBLC,
	generateBlacklist as generateBL,
	addBlacklistCriteria as addBLC,
	getBlacklistContents as getBLContents,
	getBlacklistCriterias as getBLC,
} from '../dao/blacklist';
import {getTag} from '../dao/tag';
import {getKara} from '../dao/kara';
import langs from 'langs';
import {getState} from '../utils/state';
import logger from '../lib/utils/logger';
import {profile} from '../lib/utils/logger';
import {formatKaraList} from './kara';
import {uuidRegexp} from '../lib/utils/constants';
import {KaraList, KaraParams} from '../lib/types/kara';
import {BLC} from '../types/blacklist';
import {isNumber} from '../lib/utils/validators';

export async function getBlacklist(params: KaraParams): Promise<KaraList> {
	profile('getBL');
	const pl = await getBLContents(params);
	const ret = formatKaraList(pl.slice(params.from, params.from + params.size), params.from, pl.length);
	profile('getBL');
	return ret;
}

export async function getBlacklistCriterias(lang?: string): Promise<BLC[]> {
	try {
		profile('getBLC');
		const blcs = await getBLC();
		return await translateBlacklistCriterias(blcs, lang);
	} catch(err) {
		throw err;
	} finally {
		profile('getBLC');
	}
}

export async function generateBlacklist() {
	return await generateBL();
}

async function isBLCriteria(blc_id: number): Promise<boolean> {
	return await isBLC(blc_id);
}

export async function emptyBlacklistCriterias() {
	logger.info('[Blacklist] Wiping criterias');
	await emptyBLC();
	return await generateBlacklist();
}

export async function deleteBlacklistCriteria(blc_id: number) {
	profile('delBLC');
	logger.info(`[Blacklist] Deleting criteria ${blc_id}`);
	if (!await isBLCriteria(blc_id)) throw `BLC ID ${blc_id} unknown`;
	await deleteBLC(blc_id);
	await generateBlacklist();
	profile('delBLC');
}

export async function addBlacklistCriteria(type: number, value: any) {
	profile('addBLC');
	let blcvalues: string[];
	typeof value === 'string'
		? blcvalues = value.split(',')
		: blcvalues = [value];
	logger.info(`[Blacklist] Adding criteria ${type} = ${blcvalues}`);
	let blcList = blcvalues.map((e: any) => {
		return {
			value: e,
			type: type
		};
	});
	try {
		if (type < 0 && type > 1004) throw `Incorrect BLC type (${type})`;
		if (type === 1001) {
			if (blcList.some((blc: BLC) => !new RegExp(uuidRegexp).test(blc.value))) throw `Blacklist criteria value mismatch : type ${type} must have UUID values`;
		}
		if (((type > 1001 && type <= 1003) || (type > 0 && type < 999)) && !blcvalues.some(isNumber)) throw `Blacklist criteria type mismatch : type ${type} must have a numeric value!`;
		await addBLC(blcList);
		return await generateBlacklist();
	} catch(err) {
		logger.error(`[Blacklist] Error adding criteria : ${JSON.stringify(err)}`)
		throw err;
	} finally {
		profile('addBLC');
	}
}

async function translateBlacklistCriterias(blcList: BLC[], lang: string): Promise<BLC[]> {
	// If lang is not provided, assume we're using node's system locale
	if (!lang) lang = getState().EngineDefaultLocale;
	// Test if lang actually exists in ISO639-1 format
	if (!langs.has('1', lang)) throw `Unknown language : ${lang}`;
	// We need to read the detected locale in ISO639-1
	const langObj = langs.where('1', lang);
	for (const i in blcList) {
		if (blcList[i].type === 1) {
			// We just need to translate the tag name if there is a translation
			if (typeof blcList[i].value !== 'string') throw `BLC value is not a string : ${blcList[i].value}`;
			blcList[i].value_i18n = blcList[i].value;
		}
		if (blcList[i].type >= 2 && blcList[i].type <= 999) {
			// We need to get the tag name and then translate it if needed
			const tag = await getTag(blcList[i].value);
			blcList[i].value_i18n = tag.i18n[langObj['2B']];
		}
		if (blcList[i].type === 1001) {
			// We have a kara ID, let's get the kara itself and append it to the value
			const kara = await getKara(blcList[i].value, 'admin', lang, 'admin');
			blcList[i].value = kara;
		}
		// No need to do anything, values have been modified if necessary
	}
	return blcList;
}