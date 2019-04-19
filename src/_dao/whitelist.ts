import {transaction, langSelector, buildClauses, db} from './database';
import {pg as yesql} from 'yesql';
import { KaraParams } from '../_types/kara';
const sql = require('./sql/whitelist');


export async function getWhitelistContents(params: KaraParams) {
	const filterClauses = params.filter
		? buildClauses(params.filter)
		: {sql: [], params: {}};
	let limitClause = '';
	let offsetClause = '';
	//Disabled until frontend manages this
	//if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	//if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	const query = sql.getWhitelistContents(filterClauses.sql, langSelector(params.lang), limitClause, offsetClause);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

export async function emptyWhitelist() {
	return await db().query(sql.emptyWhitelist);
}

export async function removeKaraFromWhitelist(wlcList: string[]) {
	const karas = wlcList.map(kara => ([
		kara
	]));
	return await transaction([{params: karas, sql: sql.removeKaraFromWhitelist}]);
}

export async function addKaraToWhitelist(karaList: string[], reason: string) {
	const karas = karaList.map((kara) => ([
		kara,
		new Date(),
		reason
	]));
	return await transaction([{params: karas, sql: sql.addKaraToWhitelist}]);
}
