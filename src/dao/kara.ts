import {pg as yesql} from 'yesql';

import { buildClauses, buildTypeClauses, copyFromData, db, transaction } from '../lib/dao/database';
import { WhereClause } from '../lib/types/database';
import { DBKara, DBKaraBase,DBYear } from '../lib/types/database/kara';
import { DBPLCAfterInsert } from '../lib/types/database/playlist';
import { Kara, KaraParams } from '../lib/types/kara';
import { PLC } from '../lib/types/playlist';
import { getConfig } from '../lib/utils/config';
import { now } from '../lib/utils/date';
import { getState } from '../utils/state';
import { sqladdKaraToPlaylist, sqladdRequested, sqladdViewcount, sqldeleteKara, sqlgetAllKaras, sqlgetKaraMini, sqlgetSongCountPerUser, sqlgetTimeSpentPerUser, sqlgetYears, sqlinsertKara, sqlremoveKaraFromPlaylist,sqlselectAllKIDs, sqlTruncateOnlineRequested, sqlupdateFreeOrphanedSongs, sqlupdateKara } from './sql/kara';


export async function getSongCountForUser(plaid: string, username: string): Promise<number> {
	const res = await db().query(sqlgetSongCountPerUser, [plaid, username]);
	return res.rows[0]?.count || 0;
}


export async function getYears(): Promise<DBYear[]> {
	const res = await db().query(sqlgetYears);
	return res.rows;
}

export async function updateKara(kara: Kara) {
	await db().query(yesql(sqlupdateKara)({
		karafile: kara.karafile,
		mediafile: kara.mediafile,
		mediasize: kara.mediasize,
		subchecksum: kara.subchecksum,
		subfile: kara.subfile,
		title: kara.title,
		year: kara.year,
		songorder: kara.songorder || null,
		duration: kara.duration,
		gain: kara.gain,
		loudnorm: kara.loudnorm,
		modified_at: kara.modified_at,
		kid: kara.kid,
		comment: kara.comment
	}));
}

export async function addKara(kara: Kara) {
	await db().query(yesql(sqlinsertKara)({
		karafile: kara.karafile,
		mediafile: kara.mediafile,
		subfile: kara.subfile,
		subchecksum: kara.subchecksum,
		title: kara.title,
		year: kara.year,
		songorder: kara.songorder || null,
		duration: kara.duration,
		gain: kara.gain,
		loudnorm: kara.loudnorm,
		modified_at: kara.modified_at,
		created_at: kara.created_at,
		kid: kara.kid,
		repository: kara.repository,
		mediasize: kara.mediasize,
		download_status: 'DOWNLOADED',
		comment: kara.comment
	}));
}

export async function getSongTimeSpentForUser(plaid: string, username: string): Promise<number> {
	const res = await db().query(sqlgetTimeSpentPerUser,[
		plaid,
		username
	]);
	return res.rows[0]?.time_spent || 0;
}

export async function deleteKara(kids: string[]) {
	await db().query(sqldeleteKara, [kids]);
}

export async function selectAllKaras(params: KaraParams): Promise<DBKara[]> {
	const filterClauses: WhereClause = params.filter ? buildClauses(params.filter) : {sql: [], params: {}, additionalFrom: []};
	let typeClauses = params.q ? buildTypeClauses(params.q, params.order) : '';
	// Hide blacklisted songs
	if (params.blacklist) typeClauses = `${typeClauses} AND ak.pk_kid NOT IN (SELECT fk_kid FROM blacklist)`;
	let orderClauses = '';
	let limitClause = '';
	let offsetClause = '';
	let havingClause = '';
	let groupClause = '';
	let selectRequested = `COUNT(rq.*)::integer AS requested,
	MAX(rq.requested_at) AS lastrequested_at,
	`;
	const joinClauses = [' LEFT OUTER JOIN requested AS rq ON rq.fk_kid = ak.pk_kid '];
	// This is normal behaviour without anyone.
	let groupClauseEnd = '';
	// Search mode to filter karas played or requested in a particular session
	if (params.order === 'history') {
		orderClauses = 'lastplayed_at DESC NULLS LAST, ';
	}
	if (params.order === 'sessionPlayed') {
		orderClauses = groupClause = 'p.played_at, ';
	}
	if (params.order === 'sessionRequested') {
		orderClauses = groupClause = 'rq.requested_at, ';
	}
	if (params.order === 'recent') orderClauses = 'created_at DESC, ';
	if (params.order === 'requested' && getConfig().Online.FetchPopularSongs) {
		orderClauses = 'requested DESC, ';
		groupClauseEnd = ', requested';
		selectRequested = 'orq.requested AS requested, ';
		// Emptying joinClauses first before adding something to it.
		joinClauses.splice(0, joinClauses.length);
		joinClauses.push(' LEFT OUTER JOIN online_requested AS orq ON orq.fk_kid = ak.pk_kid ');
		typeClauses = ' AND requested > 1';
	}
	if (params.order === 'requestedLocal' || (params.order === 'requested' && !getConfig().Online.FetchPopularSongs)) {
		orderClauses = 'requested DESC, ';
		havingClause = 'HAVING COUNT(rq.*) > 1';
	}
	if (params.order === 'played') {
		orderClauses = 'played DESC, ';
		havingClause = 'HAVING COUNT(p.*) > 1';
	}
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	// If we're asking for random songs, here we modify the query to get them.
	if (params.random > 0) {
		orderClauses = `RANDOM(), ${orderClauses}`;
		limitClause = `LIMIT ${params.random}`;
		typeClauses = `${typeClauses} AND ak.pk_kid NOT IN (
			SELECT pc.fk_kid
			FROM playlist_content pc
			WHERE pc.fk_id_playlist = '${getState().publicPlaid}'
		)`;
	}
	const query = sqlgetAllKaras(filterClauses.sql, typeClauses, groupClause, orderClauses, havingClause, limitClause, offsetClause, filterClauses.additionalFrom, selectRequested, groupClauseEnd, joinClauses);
	const queryParams = {
		publicPlaylist_id: getState().publicPlaid,
		dejavu_time: new Date(now() - (getConfig().Playlist.MaxDejaVuTime * 60 * 1000)),
		username: params.username || 'admin',
		...filterClauses.params
	};
	const res = await db().query(yesql(query)(queryParams));
	return res.rows;
}

export function updateFreeOrphanedSongs(expireTime: number) {
	return db().query(sqlupdateFreeOrphanedSongs, [new Date(expireTime * 1000)]);
}

export async function getKaraMini(kid: string): Promise<DBKaraBase> {
	const res = await db().query(sqlgetKaraMini, [kid]);
	return res.rows[0] || {};
}

export function addPlayed(kid: string) {
	return db().query(yesql(sqladdViewcount)({
		kid: kid,
		played_at: new Date(),
		seid: getState().currentSessionID
	}));
}

export function addKaraToRequests(username: string, karaList: string[]) {
	const karas = karaList.map(kara => ([
		username,
		kara,
		new Date(),
		getState().currentSessionID
	]));
	return transaction({params: karas, sql: sqladdRequested});
}

export async function selectAllKIDs(): Promise<string[]> {
	const res = await db().query(sqlselectAllKIDs);
	return res.rows.map((k: Kara) => k.kid);
}

export async function addKaraToPlaylist(karaList: PLC[]): Promise<DBPLCAfterInsert[]> {
	if (karaList.length > 1) {
		const karas: any[] = karaList.map(kara => ([
			kara.plaid,
			kara.username,
			kara.nickname,
			kara.kid,
			kara.created_at,
			kara.pos,
			kara.flag_free || false,
			kara.flag_visible || true,
			kara.flag_refused || false,
			kara.flag_accepted || false
		]));
		const res = await transaction({params: karas, sql: sqladdKaraToPlaylist});
		return res;
	} else {
		const kara = karaList[0];
		const res = await db().query(sqladdKaraToPlaylist, [
			kara.plaid,
			kara.username,
			kara.nickname,
			kara.kid,
			kara.created_at,
			kara.pos,
			false,
			kara.flag_visible,
			kara.flag_refused || false,
			kara.flag_accepted || false
		]);
		return res.rows;
	}
}

export function removeKaraFromPlaylist(karas: number[]) {
	return db().query(sqlremoveKaraFromPlaylist.replace(/\$plcid/,karas.join(',')));
}

export function emptyOnlineRequested() {
	return db().query(sqlTruncateOnlineRequested);
}

export function insertOnlineRequested(requested: string[][]) {
	return copyFromData('online_requested', requested);
}
