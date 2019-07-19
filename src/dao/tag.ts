import {db, paramWords} from '../lib/dao/database';
import {pg as yesql} from 'yesql';
import { TagParams, Tag, TagAndType } from '../lib/types/tag';
import { DBTag } from '../lib/types/database/tag';
import { WhereClause } from '../types/database';
const sql = require('./sql/tag');

export async function getTag(id: string): Promise<DBTag> {
	const res = await db().query(sql.getTag, [id]);
	return res.rows[0];
}

export async function getAllTags(params: TagParams): Promise<DBTag[]> {
	let filterClauses = params.filter
		? buildTagClauses(params.filter)
		: {sql: [], params: {}};
	let typeClauses = params.type ? ` AND types @> ARRAY[${params.type}]` : '';
	let limitClause = '';
	let offsetClause = '';
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	const query = sql.getAllTags(filterClauses.sql, typeClauses, limitClause, offsetClause);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

function buildTagClauses(words: string): WhereClause {
	const params = paramWords(words);
	let sql = [];
	for (const word of Object.keys(params)) {
		sql.push(`lower(unaccent(name)) LIKE :${word} OR
		lower(unaccent(i18n::varchar)) LIKE :${word} OR
		lower(unaccent(search_aliases)) LIKE :${word}
		`);
	}
	return {
		sql: sql,
		params: params
	};
}

export async function insertTag(tag: Tag) {
	return await db().query(yesql(sql.insertTag)({
		tid: tag.tid,
		name: tag.name,
		types: tag.types,
		short: tag.short || null,
		i18n: tag.i18n || {},
		aliases: tag.aliases || null,
		tagfile: tag.tagfile
	}));
}

export async function updateKaraTags(kid: string, tags: TagAndType[]) {
	await db().query(sql.deleteTagsByKara, [kid]);
	for (const tag of tags) {
		await db().query(yesql(sql.insertKaraTags)({
			kid: kid,
			tid: tag.tid,
			type: tag.type
		}));
	}
}

export async function selectTagByNameAndType(name: string, types: number[]): Promise<DBTag> {
	const res = await db().query(yesql(sql.getTagByNameAndType)({
		name: name,
		types: types
	}));
	return res.rows[0];
}

export async function updateTag(tag: Tag) {
	return await db().query(yesql(sql.updateTag)({
		tid: tag.tid,
		name: tag.name,
		aliases: JSON.stringify(tag.aliases),
		tagfile: tag.tagfile,
		short: tag.short,
		types: tag.types,
		i18n: tag.i18n
	}));
}

export async function removeTag(tid: string) {
	await db().query(sql.deleteTag, [tid]);
}