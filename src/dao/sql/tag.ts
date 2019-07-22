// SQL for tags

export const getTag = `
SELECT tid, name, types, short, aliases, i18n, karacount, tagfile
FROM all_tags
WHERE tid = $1
`;

export const getAllTags = (filterClauses: string[], typeClauses: string, limitClause: string, offsetClause: string) => `
SELECT tid,
	types,
	name,
	short,
	aliases,
	i18n,
	karacount,
	tagfile
FROM all_tags
WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
  ${typeClauses}
ORDER BY name
${limitClause}
${offsetClause}
`;

export const insertTag = `
INSERT INTO tag(
	pk_tid,
	name,
	types,
	short,
	i18n,
	aliases,
	tagfile
)
VALUES(
	$1,
	$2,
	$3,
	$4,
	$5,
	$6,
	$7
)
ON CONFLICT (pk_tid) DO UPDATE SET
	types = $3
`;

export const updateKaraTagTID = `
UPDATE kara_tag SET fk_tid = $2 WHERE fk_tid = $1;
`;

export const deleteTagsByKara = 'DELETE FROM kara_tag WHERE fk_kid = $1';

export const insertKaraTags = `
INSERT INTO kara_tag(
	fk_kid,
	fk_tid,
	type
)
VALUES(
	:kid,
	:tid,
	:type
);
`;

export const getTagByNameAndType = `
SELECT
	name,
	pk_tid AS tid
FROM tag
WHERE name = $1
  AND types @> $2
;`;

export const updateTag = `
UPDATE tag
SET
	name = $1,
	aliases = $2,
	tagfile = $3,
	short = $4,
	types = $5,
	i18n = $6
WHERE pk_tid = $7;
`;

export const deleteTag = 'DELETE FROM tag WHERE pk_tid = $1';