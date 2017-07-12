SELECT ak.PK_id_kara AS id_kara,
      ak.title AS title,
      ak.NORM_title AS NORM_title,
      ak.songorder AS songorder,
      ak.series AS series,
      ak.NORM_series AS NORM_series,
      ak.series_altname AS series_altname,
      ak.NORM_series_altname AS NORM_series_altname,
      ak.singer AS singer,
      ak.NORM_singer AS NORM_singer,
      ak.songtype AS songtype,      
      ak.creator AS creator,
      ak.NORM_creator AS NORM_creator,
      ak.language AS language,
      ak.author AS author,
      ak.NORM_author AS NORM_author,
      ak.misc AS misc   
 FROM all_karas AS ak
ORDER BY ak.language, ak.series, ak.title, ak.songtype, ak.songorder