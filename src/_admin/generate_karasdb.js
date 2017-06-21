// Génération de la base de données depuis un dossier de datas
var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var fs = require("fs");
var ini = require("ini");
var timestamp = require("unix-timestamp");
//var probe = require('d:/perso/toyundamugen-appv2/src/_common/modules/node-ffprobe');
var math = require('mathjs');
var S = require('string');
const uuidV4 = require("uuid/v4");
const async = require('async');

// Pour l'instant on met les infos en dur.
// Plus tard dans le fichier de config
const karasdir = './app/data/karas';
const videosdir = './app/data/videos';
const karas_dbfile = './app/db/karas.sqlite3';

const sqlCreateKarasDBfile = './src/_common/db/karas.sqlite3.sql';
const sqlCreateKarasDBViewAllfile = './src/_common/db/view_all.view.sql';

function addTag(tag,tagtype,id_kara,db) {
    // Fonction d'ajout d'un tag dans la base, en le liant à un kara
    // Vérifier si le tag existe
    // Si oui on récupère son ID
    // Si non on l'ajoute et on récupère son ID
    // Après on relie le kara au tag
    var sqlGetTagID = "SELECT PK_id_tag FROM tag WHERE name=$name AND tagtype=$tagtype";
    var id_tag = undefined;
    var tag_from_db = db.get(sqlGetTagID, {
            $name: tag,
            $tagtype: tagtype
            },
            function (err, row){
                if (err) {
                    console.log("Impossible de retrouver l'ID tag : "+err);
                    process.exit();
                }
                if (row) {
                    //Tag ID connu en base
                    id_tag = row.PK_id_tag;
                    LinkTag(id_tag,id_kara);
                } else {
                    //Tag ID non connu
                    sqlInsertTag = "INSERT INTO tag(tagtype,name) VALUES($tagtype,$tag)";
                    db.run(sqlInsertTag, {
                    $tagtype: tagtype, 
                    $tag: tag
                    }, function (err) {
                        if (err) {
                        console.log("Erreur d'insertion du tag : "+err);
                        process.exit();
                        }
                        console.log('['+id_kara+'] Nouveau tag : '+tag)
                        id_tag = this.lastID;
                        LinkTag(id_tag,id_kara);
                    });
                }
                // Link du tag et du kara
                function LinkTag(id_tag,id_kara) {
                    sqlLinkKaraTag = "INSERT INTO kara_tag(FK_id_kara,FK_id_tag) VALUES($id_kara,$id_tag)";
                    db.run(sqlLinkKaraTag, {
                        $id_kara: id_kara, 
                        $id_tag: id_tag
                        }, function (err) {
                            if (err) {
                            console.log("Erreur de lien tag/kara : "+err);
                            process.exit();
                        }  
                        console.log('['+id_kara+'] Link tag : '+tag)                      
                });

                }
            }
        );    
}

function addSerie(serie,id_kara,db) {
    // Fonction pour ajouter une série et la lier à un kara
    // Vérifier si la série existe
    // Si oui on récupère son ID
    // Si non on l'ajoute et on récupère son ID
    // Après on relie le kara à la série
    var sqlGetSeriesID = "SELECT PK_id_series FROM series WHERE name=$name";
    var id_series = undefined;
    var serie_from_db = db.get(sqlGetSeriesID, {
            $name: serie
            },
            function (err, row){
                if (err) {
                    console.log("Impossible de retrouver l'ID série : "+err);
                    process.exit();
                }
                if (row) {
                    //Serie ID connu en base
                    id_serie = row.PK_id_serie;
                    LinkSerie(id_serie,id_kara);                    
                } else {
                    //Serie ID non connu
                    sqlInsertSerie = "INSERT INTO series(name) VALUES($serie)";
                    db.run(sqlInsertSerie, {
                    $serie: serie
                    }, function (err) {
                        if (err) {
                        console.log("Erreur d'insertion du série : "+err);
                        process.exit();
                        }
                        id_serie = this.lastID;
                        console.log('['+id_kara+'] Nouvelle série : '+serie)
                        LinkSerie(id_serie,id_kara);
                    });
                }
                function LinkSerie(id_serie,id_kara) {
                    // Link de la série et du kara
                    sqlLinkKaraSeries = "INSERT INTO kara_series(FK_id_kara,FK_id_series) VALUES($id_kara,$id_series)";
                    db.run(sqlLinkKaraSeries, {
                    $id_kara: id_kara, 
                    $id_series: id_series
                    }, function (err) {
                        if (err) {
                        console.log("Erreur de lien series/kara : "+err);
                        process.exit();
                    }                      
                    console.log('['+id_kara+'] Link série : '+serie)  
                    });
                }
                
            }
        );    
}

function addKara(kara,db) {
    // Fonction d'ajout d'un kara dans la base
  
    // Parse du .kara
    
    var karadata = ini.parse(fs.readFileSync(karasdir+'/'+kara,'utf-8'));

    // Création d'un timestamp
    timestamp.round = true;
    var DateAdded = timestamp.now();
    var DateModif = DateAdded;

    // Test de présence du KID
    if (karadata.KID) {
        // KID présent
        var KID = karadata.KID;
        // On vérifie si le KID existe en base.
        var sqlSelectKaraKID = 'SELECT * FROM kara WHERE kid=$KID';
        var id_kara = undefined;
        var kara_from_db = db.get(sqlSelectKaraKID, 
            {$KID: KID},
            function (err, row){
                if (err) {
                    console.log("Impossible de retrouver le KID: "+err);
                    process.exit();
                }
                if (row) {
                    //KID connu en base
                    console.log("KID trouvé avec ID : "+row.PK_id_kara);
                    id_kara = row.PK_id_kara;
                    return row;
                } else {
                    //KID non trouvé en base
                    sqlInsertKaraFirst = 'INSERT INTO kara(kid,date_added) VALUES($KID, $date_added)';
                    db.run(sqlInsertKaraFirst, {
                    $KID: KID, 
                    $date_added: DateAdded
                    }, function (err) {
                        if (err) {
                        console.log("Erreur d'insertion du kara initial : "+err);
                        process.exit();
                        }
                        id_kara = this.lastID;
                        console.log("ID du kara crée : "+id_kara+" ("+kara+")");
                        UpdateKara(id_kara);
                    });
                }                
            }
        );    
    } else {
        // KID pas présent, on l'ajoute
        // Génération
        var KID = uuidV4();
        karadata.KID = KID;        
        fs.writeFile(karasdir+'/'+kara,ini.stringify(karadata),function (err,rep) {
            if (err) {
                console.log("Impossible d'écrire le .kara !");
                process.exit();
            }
            console.log('.kara réécrit ('+kara+')');
            fs.appendFile(karasdir+'/'+kara,';DO NOT MODIFY - KID GENERATED AUTOMATICALLY',function(err) {
                if (err) {
                    console.log("Impossible d'ajouter la ligne de commentaire au .kara!: "+err);
                    process.exit();
                }
                console.log('Commentaire ajouté ('+kara+')');
            });
        });

        // On insère les premières infos du kara
        var sqlInsertKaraFirst = 'INSERT INTO kara(kid,date_added) VALUES($KID, $date_added)';
        db.run(sqlInsertKaraFirst, {
            $KID: KID, 
            $date_added: DateAdded
        }, function (err) {
            if (err) {
                console.log("Erreur d'insertion du kara initial: "+err);
                process.exit();
            }
            id_kara = this.lastID;            
            console.log("ID du kara crée : "+id_kara+" ("+kara+")");
            UpdateKara(id_kara);
        });        
    }
    
    function UpdateKara(id_kara) {
    
        // Récupérer le nom du .kara sans le .kara
        var karaWOExtension = S(kara).chompRight('.kara');

        // Découper le nom du kara : langue, série, type, titre
        var karaInfos = karaWOExtension.split(' - ');
        var karaSerie = karaInfos[1];
        var karaType = karaInfos[2];
        var karaTitle = karaInfos[3];    

        // Vérifier si y'a OAV / OVA dans le nom de série ou le type
        if (S(karaSerie).contains(' OAV') || S(karaSerie).contains(' OVA') || S(karaType).contains('OAV')) {
            addTag('TAG_OVA',7,id_kara,db);
            karaSerie = S(karaSerie).strip(' OAV',' OVA');        
        }

        //Ajout de la série
        if (!S(karaType).contains('LIVE') || !S(karaType).contains('MV')){
            addSerie(karaSerie,id_kara,db);
        }    

        // Ordre : trouver le songorder à la suite du type
        var karaOrder = undefined;
        if (S(karaType).right(2).isNumeric) {
            karaOrder = S(karaType).right(2);
            if (S(karaOrder).left(1) == "0") {
                karaOrder = S(karaOrder).right(1);
            }        
        } else {
            if (S(karaType).right(1).issNumeric) {
                karaOrder = S(karaType).right(1);
            } else {
                karaOrder = 1;
            }
        }

        // Chopper l'année dans le .kara
        var karaYear = karadata.year;
        
        // Fichiers vidéo et sub
        var karaVideofile = karadata.videofile;
        var karaSubfile = karadata.subfile;
    

        // Longueur du kara
        var karaVideolength = undefined;
        /* probe.FFPROBE_PATH = 'app/bin/ffprobe.exe';
        probe(videosdir+'/'+videofile,function (err, videodata) {
            if (err) {
                console.log("["+id_kara+"] Impossible de probe la vidéo : "+err);
                karaVideolength = 0;
            } else {
                karaVideolength = math.round(videodata.format.duration);
                sqlUpdateKaraVideoLength = 'UPDATE kara SET videolength = $videolength WHERE PK_id_kara = $id_kara';
                db.run(sqlUpdateKaraVideoLength, {
                    $id_kara: id_kara, 
                    $videolength: videolength
                }, function (err) {
                if (err) {
                    console.log("["+id_kara+"] Erreur d'update de la durée de la vidéo : "+err);
                    process.exit();
                    }
                });  
            }
        });
        */ 
        // Check si singer est présent
        // Vérifier si plusieurs séparés par , ou + ou and ou &
        if (!S(karadata.singer).isEmpty) {
            var singers = karadata.singer.split(',');
            var singer = undefined;
            async.each(singers, function(singer, callback){
                    addTag(singer,2,id_kara,db);
                    callback();
            }, function(err) {
                if (err) {
                    console.log("Erreur ajout Tag Singer");
                }
            });                       
        }
        // Check si author est présent
        // Vérifier si plusieurs séparés par des , + and ou &
        if (!S(karadata.author).isEmpty) {
            var authors = karadata.author.split(',');
            var author = undefined;
            async.each(authors, function(author, callback){
                    addTag(author,6,id_kara,db);
                    callback();
            }, function(err) {
                if (err) {
                    console.log("Erreur ajout Tag author");
                }
            });                       
        }
        // Check si creator est présent
        // Vérifier si plusieurs séparés par des , + and ou &
        if (!S(karadata.creator).isEmpty) {
            var creators = karadata.creator.split(',');
            var creator = undefined;
            async.each(creators, function(creator, callback){
                    addTag(creator,6,id_kara,db);
                    callback();
            }, function(err) {
                if (err) {
                    console.log("Erreur ajout Tag creator");
                }
            });                       
        }
        // Check si songwriter est présent
        // Vérifier si plusieurs séparés par des , + and ou &
        if (!S(karadata.songwriter).isEmpty) {
            var songwriters = karadata.songwriter.split(',');
            var songwriter = undefined;
            async.each(songwriters, function(songwriter, callback){
                    addTag(songwriter,8,id_kara,db);
                    callback();
            }, function(err) {
                if (err) {
                    console.log("Erreur ajout Tag songwriter");
                }
            });                       
        }

        // Langues
        // Check la langue dans lang= 
        if (!S(karadata.lang).isEmpty) {
            var langs = karadata.lang.split(',');
            var lang = undefined;
            async.each(langs, function(lang, callback){
                    addTag(lang,5,id_kara,db);
                    callback();
            }, function(err) {
                if (err) {
                    console.log("Erreur ajout Tag lang");
                }
            });                       
        }

        // Check du type de song
        if (S(karaType).contains('AMV')) {
            addTag('TYPE_AMV',3,id_kara,db);
        }
        if (S(karaType).contains('CM')) {
            addTag('TYPE_CM',3,id_kara,db);
        }
        if (S(karaType).contains('ED')) {
            addTag('TYPE_ED',3,id_kara,db);
        }
        if (S(karaType).contains('GAME')) {
            addTag('TAG_VIDEOGAME',7,id_kara,db);
        }
        if (S(karaType).contains('GC')) {
            addTag('TAG_GAMECUBE',7,id_kara,db);
        }
        if (S(karaType).contains('IN')) {
            addTag('TYPE_INSERTSONG',3,id_kara,db);
        }
        if (S(karaType).contains('LIVE')) {
            addTag('TYPE_CONCERT',3,id_kara,db);
        }
        if (S(karaType).contains('MOVIE')) {
            addTag('TAG_MOVIE',7,id_kara,db);
        }
        if (S(karaType).contains('OAV')) {
            addTag('TAG_OVA',7,id_kara,db);
        }
        if (S(karaType).contains('OP')) {
            addTag('TYPE_OP',3,id_kara,db);
        }
        if (S(karaType).contains('MV')) {
            addTag('TYPE_MUSIC',3,id_kara,db);
        }
        if (S(karaType).contains('OT')) {
            addTag('TYPE_OTHER',3,id_kara,db);
        }
        if (S(karaType).contains('PS3')) {
            addTag('TAG_PS3',7,id_kara,db);
        }
        if (S(karaType).contains('PS2')) {
            addTag('TAG_PS2',7,id_kara,db);
        }
        if (S(karaType).contains('PSV')) {
            addTag('TAG_PSV',7,id_kara,db);
        }
        if (S(karaType).contains('PSX')) {
            addTag('TAG_PSX',7,id_kara,db);
        }
        if (S(karaType).contains('PV')) {
            addTag('TYPE_PV',3,id_kara,db);
        }
        if (S(karaType).contains('R18')) {
            addTag('TAG_R18',7,id_kara,db);
        }
        if (S(karaType).contains('REMIX')) {
            addTag('TAG_PARODY',7,id_kara,db);
        }
        if (S(karaType).contains('SPECIAL')) {
            addTag('TAG_SPECIAL',7,id_kara,db);
        }
        if (S(karaType).contains('VOCA')) {
            addTag('TAG_VOCALOID',7,id_kara,db);
        }
        if (S(karaType).contains('XBOX360')) {
            addTag('TAG_XBOX360',7,id_kara,db);
        }

        // Check valeur tag 
        // Séparés par des virgules
        // Si tag trouvable dans le fichier de localisation, alors on remplace par la variable de localisation
        // Sinon on stocke tel quel et on considère que c'est un tag personnalisé
        if (!S(karadata.tag).isEmpty) {
            if (!S(karadata.tag).contains('Non-anime')){
                addTag('TAG_ANIME',7,id_kara,db)
            }
            var tags = karadata.tag.split(',');
            var tag = undefined;
            async.each(tags, function(tag, callback){
                    addTag(tag,7,id_kara,db);
                    callback();
            }, function(err) {
                if (err) {
                    console.log("Erreur ajout Tag tag");
                }
            });                       
        }

        // Update dans la bdd des infos qu'on a :
        // Title
        // Songorder
        // Année
        // Vidéofile
        // Subfile
        // Datemodif
        // et tout ça avec id_kara
        var sqlUpdateKara = "UPDATE kara SET title = $title, songorder = $songorder, year = $year, videofile = $videofile, subfile = $subfile, date_last_modified = $datemodif WHERE PK_id_kara = $id_kara";
        db.run(sqlUpdateKara, {
                    $id_kara: id_kara, 
                    $title: karaTitle,
                    $songorder: karaOrder,
                    $year: karaYear,
                    $videofile: karaVideofile,
                    $subfile: karaSubfile,
                    $datemodif: DateModif
                }, function (err) {
                    if (err) {
                        console.log("Erreur d'update du kara : "+err);
                        process.exit();
                    }
                    console.log("["+id_kara+"] Kara enregistré.")
                });
    }
}

// Suppression de la bdd d'abord
fs.unlinkSync(karas_dbfile);

// Connexion et création de la bdd
var karas_db = new sqlite3.Database(karas_dbfile,function (err,rep){ 
    if (err) {
        console.log('Erreur ouverture base Karas');
        process.exit();
    }
    console.log('Creation BDD OK');
    // Création des tables
    var sqlCreateKarasDB = fs.readFileSync(sqlCreateKarasDBfile,'utf-8');
    karas_db.exec(sqlCreateKarasDB, function (err, rep){
        if (err) {
            console.log('Erreur create');
            console.log(err);
            console.log(sqlCreateKarasDB);
        } else {
        console.log('Creation tables OK');
        var sqlCreateKarasDBViewAll = fs.readFileSync(sqlCreateKarasDBViewAllfile,'utf8');
        karas_db.exec(sqlCreateKarasDBViewAll, function (err, rep){
            if (err) {
                console.log('Erreur create view');
                console.log(err);
                console.log(sqlCreateKarasDBViewAll);
            } else {
                console.log('Creation view OK');
                var karas = fs.readdirSync(karasdir);
                console.log('Lecture dossier OK');
                async.each(karas, function(kara, callback){
                    addKara(kara,karas_db);
                    callback();
                }, function(err) {
                    if (err) {
                    console.log("Erreur ajout kara : "+kara);
                    }
                });                
                // Parse de series_altnames.csv
    
                karas_db.close();
            }
        });
        }
    }); 

    
 

    
});

