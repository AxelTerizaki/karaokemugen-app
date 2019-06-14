import {expand, flatten, buildTypeClauses, langSelector, buildClauses, db, transaction} from '../lib/dao/database';
import {getConfig} from '../lib/utils/config';
import {asyncExists, asyncReadFile, resolveFileInDirs} from '../lib/utils/files';
import { getState } from '../utils/state';
import {pg as yesql} from 'yesql';
import {now} from '../lib/utils/date';
import { Kara, KaraParams } from '../lib/types/kara';
import { Role, User } from '../lib/types/user';
import {PLC} from '../types/playlist';
import { DBYear, DBKara, DBKaraHistory, DBKaraBase } from '../types/database/kara';
import { getUser } from './user';

const sql = require('./sql/kara');

export async function getSongCountForUser(playlist_id: number, username: string): Promise<number> {
	const res = await db().query(sql.getSongCountPerUser, [playlist_id, username]);
	return res.rows[0].count;
}


export async function getYears(): Promise<DBYear[]> {
	const res = await db().query(sql.getYears);
	return res.rows;
}

export async function updateKara(kara: Kara) {
	await db().query(yesql(sql.updateKara)({
		karafile: kara.karafile,
		mediafile: kara.mediafile,
		subfile: kara.subfile,
		title: kara.title,
		year: kara.year,
		songorder: kara.order || null,
		duration: kara.mediaduration,
		gain: kara.mediagain,
		modified_at: kara.datemodif,
		kid: kara.kid
	}));
}

export async function addKara(kara: Kara) {
	await db().query(yesql(sql.insertKara)({
		karafile: kara.karafile,
		mediafile: kara.mediafile,
		subfile: kara.subfile,
		title: kara.title,
		year: kara.year,
		songorder: kara.order || null,
		duration: kara.mediaduration,
		gain: kara.mediagain,
		modified_at: kara.datemodif,
		created_at: kara.dateadded,
		kid: kara.kid,
		//Default for now.
		repo: 'kara.moe'
	}));
}

export async function getSongTimeSpentForUser(playlist_id: number, username: string): Promise<number> {
	const res = await db().query(sql.getTimeSpentPerUser,[
		playlist_id,
		username
	]);
	return res.rows[0].time_spent;
}

export async function getKara(kid: string, username: string, lang: string, role: Role): Promise<DBKara> {
	const res = await selectAllKaras({
		username: username,
		filter: null,
		lang: lang,
		mode: 'kid',
		modeValue: kid,
		admin: role === 'admin'
	 });
	return res[0];
}


export async function deleteKara(kid: string) {
	await db().query(sql.deleteKara, [kid]);
}

export async function selectAllKaras(params: KaraParams): Promise<DBKara[]> {
	let filterClauses = params.filter ? buildClauses(params.filter) : {sql: [], params: {}};
	let typeClauses = params.mode ? buildTypeClauses(params.mode, params.modeValue) : '';
	// Hide blacklisted songs if not admin
	if (!params.admin) typeClauses = `${typeClauses} AND ak.kid NOT IN (SELECT fk_kid FROM blacklist)`;
	let orderClauses = '';
	let limitClause = '';
	let offsetClause = '';
	let havingClause = '';
	if (params.mode === 'recent') orderClauses = 'created_at DESC, ';
	if (params.mode === 'requested') {
		orderClauses = 'requested DESC, ';
		havingClause = 'HAVING COUNT(rq.*) > 1';
	}
	if (params.mode === 'played') {
		orderClauses = 'played DESC, ';
		havingClause = 'HAVING COUNT(p.*) > 1';
	}
	//Disabled until we get the frontend to work around this.
	//if (from > 0) offsetClause = `OFFSET ${params.from} `;
	//if (size > 0) limitClause = `LIMIT ${prams.size} `;
	// If we're asking for random songs, here we modify the query to get them.
	if (params.random > 0) {
		orderClauses = `RANDOM(), ${orderClauses}`;
		limitClause = `LIMIT ${params.random}`;
		typeClauses = `${typeClauses} AND ak.kid NOT IN (
			SELECT pc.fk_kid
			FROM playlist_content pc
			WHERE pc.fk_id_playlist = ${getState().modePlaylistID}
		)`;
	}
	let user: User = {};
	let userMode = -1;
	let userLangs = {main: null, fallback: null};
	if (params.username) user = await getUser(params.username);
	if (user) {
		userMode = user.series_lang_mode;
		userLangs = {main: user.main_series_lang, fallback: user.fallback_series_lang};
	}
	const query = sql.getAllKaras(filterClauses.sql, langSelector(params.lang, userMode, userLangs), typeClauses, orderClauses, havingClause, limitClause, offsetClause);
	const queryParams = {
		dejavu_time: new Date(now() - (getConfig().Playlist.MaxDejaVuTime * 60 * 1000)),
		username: params.username,
		...filterClauses.params
	};
	const res = await db().query(yesql(query)(queryParams));
	return res.rows;
}

export async function getKaraHistory(): Promise<DBKaraHistory[]> {
	const res = await db().query(sql.getKaraHistory);
	return res.rows;
}

export async function updateFreeOrphanedSongs(expireTime: number) {
	return await db().query(sql.updateFreeOrphanedSongs, [new Date(expireTime * 1000)]);
}

export async function getKaraMini(kid: string): Promise<DBKaraBase> {
	const res = await db().query(sql.getKaraMini, [kid]);
	return res.rows[0];
}

export async function getASS(sub: string): Promise<string> {
	const conf = getConfig();
	const subfile = await resolveFileInDirs(sub, conf.System.Path.Lyrics);
	if (await asyncExists(subfile)) return await asyncReadFile(subfile, 'utf-8');
	throw 'Subfile not found';
}

export async function addPlayed(kid: string) {
	return await db().query(yesql(sql.addViewcount)({
		kid: kid,
		played_at: new Date(),
		started_at: getState().sessionStart
	}));
}

export async function addKaraToRequests(username: string, karaList: string[]) {
	const karas = karaList.map(kara => ([
		username,
		kara,
		new Date(),
		getState().sessionStart
	]));
	return await transaction([{params: karas, sql: sql.addRequested}]);
}

export async function resetViewcounts() {
	return await db().query(sql.resetViewcounts);
}

export async function selectAllKIDs(): Promise<string[]> {
	const res = await db().query(sql.selectAllKIDs);
	return res.rows.map((k: Kara) => k.kid);
}

export async function addKaraToPlaylist(karaList: PLC[]) {
	const karas: any[][] = karaList.map(kara => ([
		kara.playlist_id,
		kara.username,
		kara.nickname,
		kara.kid,
		kara.created_at,
		kara.pos,
		false,
		false
	]));
	const query = sql.addKaraToPlaylist(expand(karas.length, karas[0].length));
	const values = flatten(karas);
	return await db().query(query, values);
}

export async function removeKaraFromPlaylist(karas: number[], playlist_id: number) {
	return await db().query(sql.removeKaraFromPlaylist.replace(/\$playlistcontent_id/,karas.join(',')), [playlist_id]);
}
