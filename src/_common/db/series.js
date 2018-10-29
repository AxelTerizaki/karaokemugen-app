// SQL for series

export const getSeries = (filterClauses, lang) => `SELECT s.pk_id_serie AS serie_id,
	s.name AS name,
	COALESCE(
		(SELECT sl.name FROM serie_lang sl WHERE sl.fk_id_serie = s.pk_id_serie AND sl.lang = ${lang.main}),
		(SELECT sl.name FROM serie_lang sl WHERE sl.fk_id_serie = s.pk_id_serie AND sl.lang = ${lang.fallback}),
		s.name)
	AS i18n_name,
	s.altname AS aliases,
	s.seriefile AS seriefile,
	(select json_group_object(lang,name) from serie_lang where fk_id_serie = s.pk_id_serie) as i18n,
	(select group_concat(NORM_name) from serie_lang where fk_id_serie = s.pk_id_serie) as NORM_i18n_name,
	sid AS SID
	FROM serie s
	WHERE 1 = 1
	${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
	ORDER BY i18n_name;
	`;

export const getSeriesKaraByKaraID = `SELECT ks1.fk_id_serie AS serie_id,
(SELECT GROUP_CONCAT(ks.fk_id_kara, ',')
  FROM kara_serie ks
  WHERE ks.fk_id_serie = ks1.fk_id_serie) AS kara_ids
FROM kara_serie ks1
WHERE ks1.fk_id_kara = $kara_id`;

export const getSerieByID = (lang) => `SELECT s.pk_id_serie AS serie_id,
	s.name AS name,
	COALESCE(
		(SELECT sl.name FROM serie_lang sl WHERE sl.fk_id_serie = s.pk_id_serie AND sl.lang = ${lang.main}),
		(SELECT sl.name FROM serie_lang sl WHERE sl.fk_id_serie = s.pk_id_serie AND sl.lang = ${lang.fallback}),
		s.name)
	AS i18n_name,
	s.altname AS aliases,
	s.seriefile AS seriefile,
	(select json_group_object(lang,name) from serie_lang where fk_id_serie = s.pk_id_serie) as i18n,
	sid AS SID
	FROM serie s
	WHERE serie_id = $serie_id
	`;


export const getSerieByName = `SELECT pk_id_serie AS serie_id
						FROM karasdb.serie
						WHERE name = $name
						`;

export const insertSerie = `INSERT INTO karasdb.serie(name, NORM_name, altname, NORM_altname, sid, seriefile)
						VALUES($name, $NORM_name, $altname, $NORM_altname, $sid, $seriefile)
						`;

export const updateSerie = `UPDATE karasdb.serie
							SET name = $name, NORM_name = $NORM_name, altname = $altname, NORM_altname = $NORM_altname, seriefile = $seriefile
							WHERE pk_id_serie = $serie_id;
							`;

export const deleteSeriesByKara = 'DELETE FROM karasdb.kara_serie WHERE fk_id_kara = $kara_id';

export const insertKaraSeries = `INSERT INTO karasdb.kara_serie(fk_id_kara,fk_id_serie)
							VALUES($kara_id, $serie_id);
							`;

export const insertSeriei18n = `INSERT INTO karasdb.serie_lang(fk_id_serie,lang, name, NORM_name)
							VALUES($id_serie,$lang,$name,$NORM_name);
							`;

export const deleteSeries = 'DELETE FROM serie WHERE pk_id_serie = $serie_id';

export const deleteSeriesi18n = 'DELETE FROM serie_lang WHERE fk_id_serie = $serie_id';