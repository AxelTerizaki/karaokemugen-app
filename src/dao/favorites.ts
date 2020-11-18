import {pg as yesql} from 'yesql';

import { buildClauses, db, transaction} from '../lib/dao/database';
import { WhereClause } from '../lib/types/database';
import { DBKara } from '../lib/types/database/kara';
import { FavParams } from '../types/favorites';
import { sqlgetFavorites, sqlinsertFavorites,sqlremoveFavorites } from './sql/favorites';

export async function selectFavorites(params: FavParams): Promise<DBKara[]> {
	const filterClauses: WhereClause = params.filter ? buildClauses(params.filter) : {sql: [], params: {}, additionalFrom: []};
	filterClauses.params.username = params.username;
	let limitClause = '';
	let offsetClause = '';
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	const query = sqlgetFavorites(filterClauses.sql, limitClause, offsetClause, filterClauses.additionalFrom);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

export function removeFavorites(fList: string[], username: string) {
	const karas = fList.map(kara => ([
		kara,
		username
	]));
	return transaction({params: karas, sql: sqlremoveFavorites});
}

export function insertFavorites(karaList: string[], username: string) {
	const karas = karaList.map(kara => ([
		kara,
		username
	]));
	return transaction({params: karas, sql: sqlinsertFavorites});
}

