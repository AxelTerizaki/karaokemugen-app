SELECT ak.kara_id AS kara_id,
      ak.kid AS kid,
      ak.title AS title,
      ak.NORM_title AS NORM_title,
      ak.songorder AS songorder,
      ak.serie AS serie,
      ak.NORM_serie AS NORM_serie,
      ak.serie_altname AS serie_altname,
      ak.NORM_serie_altname AS NORM_serie_altname,
      ak.singer AS singer,
      ak.NORM_singer AS NORM_singer,
      ak.songtype AS songtype,
	  ak.songwriter AS songwriter,
	  ak.NORM_songwriter AS NORM_songwriter,
	  ak.year AS year,  
      ak.creator AS creator,
      ak.NORM_creator AS NORM_creator,
      ak.language AS language,
      ak.author AS author,
      ak.NORM_author AS NORM_author,
      ak.misc AS misc,
	  ak.viewcount AS viewcount,      
      ak.videofile AS videofile,
	  ak.videolength AS duration,
	  ak.gain AS gain	  
 FROM karasdb.all_karas AS ak, karasdb.kara AS k
WHERE ak.kara_id = $kara_id
  AND k.pk_id_kara = $kara_id;