SELECT 
      ak.PK_id_kara AS id_kara,
      ak.kid AS kid,
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
      ak.misc AS misc,    
      ak.viewcount AS viewcount,  
      ak.videolength AS duration,
      bl.ban_date AS date_add,
      bl.ban_reason AS reason_add,
      ak.subfile AS subfile,
      ak.videofile AS videofile
 FROM karasdb.all_karas AS ak 
INNER JOIN blacklist AS bl ON bl.fk_id_kara = ak.PK_id_kara
ORDER BY ak.language, ak.series IS NULL, ak.series, ak.songtype, ak.songorder, ak.title