var path = require('path');
var timestamp = require('unix-timestamp');
timestamp.round = true;
const logger = require('../../_common/utils/logger.js');
const S = require('string');
const assBuilder = require('./ass_builder.js');
const fs = require('fs');
const shuffle = require('knuth-shuffle').knuthShuffle;
const langs = require('langs');
const isoCountriesLanguages = require('iso-countries-languages');

module.exports = {
	SYSPATH:null,
	DB_INTERFACE:null,
	SETTINGS:null,
	samplePlaylist:[],

	init: function(){
		if(module.exports.SYSPATH === null) {
			logger.error('_engine/components/playlist_controller.js : SYSPATH is null');
			process.exit();
		}
		if(module.exports.DB_INTERFACE === null) {
			logger.error('_engine/components/playlist_controller.js : DB_INTERFACE is null');
			process.exit();
		}

		assBuilder.SYSPATH = module.exports.SYSPATH;

		logger.info('Playlist controller is READY');
	},
	toggleDisplayNickname:function(displayNickname) {
		//Get the list of karas currently in playlists and pass it over to the assBuilder
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.getAllPlaylistContents()
			.then(function(karalist){
				assBuilder.toggleDisplayNickname(karalist,displayNickname,module.exports.SETTINGS.PathTemp)
				.then(function(){					
					resolve();
				})
				.catch(function(){
					reject();
				})
			})
			.catch(function(){
				reject();
			});
		});
	},
	isCurrentPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function(){
					module.exports.DB_INTERFACE.isCurrentPlaylist(playlist_id)
						.then(function(res){
							logger.log('debug','Current = '+res);
							resolve(res);
						})
						.catch(function(err){
							reject(err);
						});
				})
				.catch(function(){
					reject('Unknown playlist ID : '+playlist_id);
				});
		});
	},
	isPublicPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function(){
					module.exports.DB_INTERFACE.isPublicPlaylist(playlist_id)
						.then(function(res){
							logger.log('debug','Public = '+res);
							resolve(res);
						})
						.catch(function(err){
							reject(err);
						});
				})
				.catch(function(){
					reject('Playlist '+playlist_id+' unknown');
				});
		});
	},
	/**
	* @function {Is there a current playlist in the database?}
	* @return {number} {Playlist ID, or error message}
	*/
	isACurrentPlaylist:function() {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isACurrentPlaylist()
				.then(function (playlist_id) {
					resolve(playlist_id);
				})
				.catch(function () {
					reject('Current playlist not found');
				});
		});
	},
	/**
	* @function {(Re)generate blacklist}
	* @return {boolean} {Promise}
	*/
	generateBlacklist:function() {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.generateBlacklist()
				.then(function () {
					resolve();
				})
				.catch(function (err) {
					reject(err);
				});
		});
	},
	/**
	* @function {Add a blacklist criteria}
	* @param  {number} blctype {Type of blacklist criteria}
	* @param  {string} blcvalue {Value of blacklist criteria}
	* @return {promise} Promise
	*/
	addBlacklistCriteria:function(blctype,blcvalue) {
		return new Promise(function(resolve,reject){
			if (blctype >= 0 && blctype <= 1001) {
				if ((blctype == 1001 || (blctype > 0 && blctype < 999)) && (!S(blcvalue).isNumeric())) {
					reject('Blacklist criteria type mismatch : type '+blctype+' must have a numeric value!');
				} else {
					module.exports.DB_INTERFACE.addBlacklistCriteria(blctype,blcvalue)
						.then(function(){
							resolve();
						})
						.catch(function(err){
							reject(err);
						});
				}
			} else {
				reject('Blacklist criteria type error : '+blctype+' is incorrect');
			}
		});
	},
	/**
	* @function {Add a kara to the whitelist}
	* @param  {number} kara_id {ID of karaoke to add}
	* @param  {string} reason {Reason for add in whitelist}
	* @return {promise} Promise
	*/
	addKaraToWhitelist:function(kara_id,reason) {
		return new Promise(function(resolve,reject){
			var isKaraInWhitelist = undefined;
			var pIsKara = new Promise((resolve,reject) => {
				module.exports.isKara(kara_id)
					.then(function() {
						resolve();
					})
					.catch(function(err) {
						reject('Unknown karaoke ID '+kara_id+' : '+err);
					});
			});
			var pIsKaraInWhitelist = new Promise((resolve,reject) => {
				module.exports.isKaraInWhitelist(kara_id)
					.then(function(isKaraInWL) {
						//Karaoke song is in whitelist, then we update the boolean and resolve the promise
						//since we don't want duplicates in playlists.
						isKaraInWhitelist = isKaraInWL;
						resolve(isKaraInWL);
					})
					.catch(function(err) {
						reject(err);
					});
			});
			Promise.all([pIsKara,pIsKaraInWhitelist])
				.then(function() {
					var date_added = timestamp.now();
					if (!isKaraInWhitelist) {
						module.exports.DB_INTERFACE.addKaraToWhitelist(kara_id,reason,date_added)
							.then(function(){
								// Regenerate blacklist to take new kara into account.

								module.exports.generateBlacklist()
									.then(function(){
										resolve();
									})
									.catch(function(err){
										reject(err);
									});
							})
							.catch(function(err){
								reject(err);
							});
					} else {
						reject('Karaoke already present in whitelist');
					}

				})
				.catch(function(err) {
					reject(err);
				});
		});
	},
	/**
	* @function {Get karaoke lyrics}
	* @param  {number} id_kara {Karaoke ID}
	* @return {string} {List of lyrics}
	*/
	getKaraLyrics:function(kara_id) {
		return new Promise(function(resolve,reject){
			var pIsKara = new Promise((resolve,reject) => {
				module.exports.isKara(kara_id)
					.then(function() {
						resolve(true);
					})
					.catch(function() {
						reject('Karaoke '+kara_id+' unknown');
					});
			});
			Promise.all([pIsKara])
				.then(function(){									
					module.exports.getKara(kara_id)
						.then(function(kara) {							
							assBuilder.getLyrics(
								module.exports.SETTINGS.PathSubs,
								module.exports.SETTINGS.PathVideos,
								kara.subfile,
								kara.videofile
								)
								.then(function(lyrics) {
									resolve(lyrics);
								})
								.catch(function(err){
									reject(err);
								});
						})
						.catch(function(err){
							reject(err);
						});
				})
				.catch(function(err){
					reject(err);
				})
		});
	},
	/**
	* @function {Delete a blacklist criteria}
	* @param  {number} blc_id {Blacklist Criteria ID}
	* @return {promise} Promise
	*/
	deleteBlacklistCriteria:function(blc_id) {
		return new Promise(function(resolve,reject){
			if (S(blc_id).isEmpty()) {
				reject('BLCID is empty');
			}
			var pIsBLC = new Promise((resolve,reject) => {
				module.exports.isBLCriteria(blc_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						reject('BLCID '+blc_id+' unknown : '+err);
					});
			});
			Promise.all([pIsBLC])
				.then(function(){
					module.exports.DB_INTERFACE.deleteBlacklistCriteria(blc_id)
						.then(function(){
							module.exports.generateBlacklist()
								.then(function(){
									resolve();
								})
								.catch(function(err){
									reject(err);
								});
						})
						.catch(function(err){
							reject(err);
						});
				});
		});

	},
	/**
	* @function {Edit a blacklist criteria}
	* @param  {number} blc_id {Blacklist Criteria ID}
	* @param  {number} blctype {Blacklist Criteria type}
	* @param  {string} blcvalue {Blacklist Criteria value}
	* @return {promise} Promise
	*/
	editBlacklistCriteria:function(blc_id,blctype,blcvalue) {
		return new Promise(function(resolve,reject){
			var pIsBLC = new Promise((resolve,reject) => {
				module.exports.isBLCriteria(blc_id)
					.then(function() {
						resolve();
					})
					.catch(function(err) {
						reject('BLCID '+blc_id+' is unknown : '+err);
					});
			});
			Promise.all([pIsBLC])
				.then(function(){
					if (blctype >= 0 && blctype <= 1001) {
						if ((blctype == 1001 || (blctype > 0 && blctype < 999)) && (!S(blcvalue).isNumeric())) {
							reject('Blacklist criteria type mismatch : type '+blctype+' must have a numeric value!');
						} else {
							module.exports.DB_INTERFACE.editBlacklistCriteria(blc_id,blctype,blcvalue)
								.then(function(){
									module.exports.generateBlacklist()
										.then(function(){
											resolve();
										})
										.catch(function(err){
											reject(err);
										});
								})
								.catch(function(err){
									reject(err);
								});
						}
					} else {
						reject('Blacklist criteria type error : '+blctype+' is incorrect');
					}
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Edit a whitelist entry}
	* @param  {number} wlc_id {Blacklist Criteria ID}
	* @param  {string} reason {Edit Reason for whitelisting}
	* @return {promise} Promise
	*/
	editWhitelistKara:function(wlc_id,reason) {
		return new Promise(function(resolve,reject){
			if (S(wlc_id).isEmpty()) {
				reject('WLCID is empty');
			}
			var pIsWLC = new Promise((resolve,reject) => {
				module.exports.isWLC(wlc_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						reject('WLCID '+wlc_id+' unknown : '+err);
					});
			});
			Promise.all([pIsWLC])
				.then(function(){
					// Editing whitelist item here
					module.exports.DB_INTERFACE.editWhitelistKara(wlc_id,reason)
						.then(function(){
							resolve();
						})
						.catch(function(err){
							reject(err);
						});
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Is there a public playlist in the database?}
	* @return {number} {Playlist ID or message}
	*/
	isAPublicPlaylist:function() {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isAPublicPlaylist()
				.then(function (playlist_id) {
					resolve(playlist_id);
				})
				.catch(function () {
					reject('Public playlist not found');
				});
		});
	},
	/**
	* @function {isPlaylist}
	* @param  {number} playlist_id {ID of playlist to check for existence}
	* @return {promise} Promise
	*/
	isPlaylist:function(playlist_id,seenFromUser) {
		//Une requête toute bête pour voir si une Playlist existe
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isPlaylist(playlist_id,seenFromUser)
			.then(function(res){
				if (res == true) {
					resolve(true);
				} else {
					reject(false);
				}
			})
			.catch(function(err){
				reject();
			});
		});
	},
	/**
	* @function {isKara}
	* @param  {number} kara_id {Karaoke ID to check for existence}
	* @return {promise} Promise
	*/
	isKara:function(kara_id) {
		//Une requête toute bête pour voir si une Playlist existe
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isKara(kara_id)
			.then(function(res){
				if (res == true) {
					resolve(true);
				} else {
					reject(false);
				}
			})
			.catch(function(err){
				reject(err);
			})
		});
	},
	/**
	* @function {is Karaoke blacklisted?}
	* @param  {number} kara_id {Karaoke ID to check in the blacklist}
	* @return {boolean} Promise with true or false)
	*/
	isKaraInBlacklist:function(kara_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isKaraInBlacklist(kara_id)
				.then(function(isKaraInBL) {
					resolve(isKaraInBL);
				})
				.catch(function(err) {
					reject(err);
				});
		});
	},
	/**
	* @function {Is it a blacklist criteria ?}
	* @param  {number} blc_id {Blacklist criteria ID}
	* @return {promise} Promise
	*/
	isBLCriteria:function(blc_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isBLCriteria(blc_id)
				.then(function(){
					resolve();
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Is it a whitelist item?}
	* @param  {type} wlc_id {ID of whitelist item}
	* @return {boolean} {Promise}
	*/
	isWLC:function(wlc_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isWLC(wlc_id)
				.then(function(){
					resolve();
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Tests if a karaoke is already in a playlist or not}
	* @param  {number} kara_id     {ID of karaoke to search}
	* @param  {number} playlist_id {ID of playlist to search into}
	* @return {boolean} {Promise}
	*/
	isKaraInPlaylist:function(kara_id,playlist_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isKaraInPlaylist(kara_id,playlist_id)
				.then(function(isKaraInPL) {
					resolve(isKaraInPL);
				})
				.catch(function(err) {
					reject(err);
				});
		});
	},
	/**
	* @function {Tests if a karaoke is already in the whitelist}
	* @param  {number} kara_id     {ID of karaoke to search}
	* @return {boolean} {Promise}
	*/
	isKaraInWhitelist:function(kara_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isKaraInWhitelist(kara_id)
				.then(function(isKaraInWL) {
					resolve(isKaraInWL);
				})
				.catch(function(err) {
					reject(err);
				});
		});
	},
	setCurrentPlaylist:function(playlist_id) {
		//TODO : Tester si la playlist existe
		return new Promise(function(resolve,reject){
			module.exports.unsetCurrentAllPlaylists()
			.then(function(){
				module.exports.DB_INTERFACE.setCurrentPlaylist(playlist_id)
				.then(function(res){
					logger.debug('Setting playlist '+playlist_id+' current flag to ON');
					module.exports.updatePlaylistLastEditTime(playlist_id)
					.then(function(){
						resolve();
					})
					.catch(function(err){
						reject(err);
					});
				})
				.catch(function(err){
					reject(err);
				})
			})
			.catch(function(err){
				reject(err);
			});
		});
	},
	/**
	* @function {setVisiblePlaylist}
	* @param  {number} playlist_id {ID of playlist to make visible}
	*/
	setVisiblePlaylist:function(playlist_id) {
		//TODO : Tester si la playlist existe
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.setVisiblePlaylist(playlist_id)
			.then(function(res){
				logger.info('Setting playlist '+playlist_id+' visible flag to ON');
				module.exports.updatePlaylistLastEditTime(playlist_id)
				.then(function(){
					resolve();
				})
				.catch(function(err){
					reject(err);
				})
			})
			.catch(function(err){
				reject(err);
			});
		});
	},
	unsetVisiblePlaylist:function(playlist_id) {
		//TODO : Tester si la playlist existe
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.unsetVisiblePlaylist(playlist_id)
			.then(function(res){
				logger.debug('Setting playlist '+playlist_id+' visible flag to OFF');
				module.exports.updatePlaylistLastEditTime(playlist_id)
				.then(function(){
					resolve();					
				})
				.catch(function(err){
					reject(err);
				});
			})
			.catch(function(err){
				reject(err);
			});
		});
	},
	setPublicPlaylist:function(playlist_id){
		//TODO : Tester si la playlist existe
		return new Promise(function(resolve,reject){
			module.exports.unsetPublicAllPlaylists()
			.then(function(){
				module.exports.DB_INTERFACE.setPublicPlaylist(playlist_id)
				.then(function(res){
					logger.debug('Setting playlist '+playlist_id+' public flag to ON');
					module.exports.updatePlaylistLastEditTime(playlist_id)
					.then(function(){
						resolve();
					})
					.catch(function(err){
						reject();
					});
				})
				.catch(function(err){
					reject(err);
				});
			})
			.catch(function(err){
				reject(err);
			});
		});
	},
	deletePlaylist:function(playlist_id,new_curorpubplaylist_id) {
		// Suppression d'une playlist. Si la playlist a un flag_public ou flag_current, il faut
		// set l'un de ces flags sur l'autre ID de playlist (optionnel) fourni
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function(){
					var pIsPublic = new Promise((resolve,reject) => {
						module.exports.isPublicPlaylist(playlist_id)
							.then(function(res) {
								if (res == true) {
									if (new_curorpubplaylist_id != undefined ) {
										logger.info('Deleting playlist '+playlist_id+', switching flags to '+new_curorpubplaylist_id);
										module.exports.setPublicPlaylist(new_curorpubplaylist_id)
										.then(function(){
											resolve(true);
										})
										.catchn(function(err){
											reject(err);
										})
									} else {
										reject('Playlist to delete is public but no new playlist ID to transfer flags to was specified');
									}

								} else {
									resolve(true);
								}
							})
							.catch(function(err) {
								reject(err);
							});
					});
					var pIsCurrent = new Promise((resolve,reject) =>	{
						module.exports.isCurrentPlaylist(playlist_id)
							.then(function(res){
								if (res == true) {
									if (new_curorpubplaylist_id != undefined ) {
										module.exports.setCurrentPlaylist(new_curorpubplaylist_id)
										.then(function() {
											resolve(true);
										})
										.catch(function(err){
											reject(err);
										})
									} else {
										reject('Playlist to delete is current but no new playlist ID to transfer flags to was specified');
									}
								} else {
									resolve(true);
								}
							})
							.catch(function(err){
								reject(err);
							});
					});
					Promise.all([pIsPublic,pIsCurrent])
						.then(function() {
							module.exports.emptyPlaylist(playlist_id);
							module.exports.DB_INTERFACE.deletePlaylist(playlist_id)
							.then(function(res) {
								var values =
								{
									playlist_id: playlist_id,
									new_curorpubplaylist_id: new_curorpubplaylist_id
								};
								resolve(values);
							})
							.catch(function(err){
								reject(err);
							});
						})
						.catch(function(err) {
							reject(err);
						});
				})
				.catch(function(){
					reject('Playlist '+playlist_id+' unknown');
				});
		});
	},
	emptyPlaylist:function(playlist_id) {
		//TODO : Tester si la playlist existe
		//TODO : Transformer en promesse.
		module.exports.DB_INTERFACE.emptyPlaylist(playlist_id);
		module.exports.updatePlaylistLastEditTime(playlist_id);
	},
	/**
	* @function {editPlaylist}
	* Edits properties of a playlist
	* @param  {number} playlist_id  {Playlist ID to edit}
	* @param  {string} name         {New name of playlist}
	* @param  {number} flag_visible {Is the playlist visible?}
	* @param  {number} flag_current {Is the playlist the current one?}
	* @param  {number} flag_public  {Is the playlist the public one?}
	*/
	editPlaylist:function(playlist_id,name,flag_visible,flag_current,flag_public) {
		return new Promise(function(resolve,reject){
			var NORM_name = S(name).latinise().s;
			var lastedit_time = timestamp.now();


			if (flag_current == 1 && flag_public == 1) {
				reject('A playlist cannot be current and public at the same time !');
			}

			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function() {
						reject('Playlist '+playlist_id+' unknown');
					});
			});
			var pUnsetFlagPublic = new Promise((resolve,reject) => {
				if (flag_public == 1) {
					module.exports.unsetPublicAllPlaylists()
						.then(function(){
							resolve();
						})
						.catch(function(){
							reject();
						});
				} else {
					resolve();
				}
			});

			var pUnsetFlagCurrent = new Promise((resolve,reject) => {
				if (flag_current == 1) {
					module.exports.unsetCurrentAllPlaylists()
						.then(function(){
							resolve();
						})
						.catch(function(){
							reject();
						});
				} else {
					resolve();
				}
			});

			Promise.all([pIsPlaylist,pUnsetFlagCurrent,pUnsetFlagPublic])
				.then(function() {
					module.exports.DB_INTERFACE.editPlaylist(playlist_id,name,NORM_name,lastedit_time,flag_visible,flag_current,flag_public)
					.then(function(){
						resolve();
					})
					.catch(function(err){
						reject(err);
					})
				})
				.catch(function(err) {
					reject(err);
				});
		});
	},
	createPlaylist:function(name,flag_visible,flag_current,flag_public) {

		// Méthode de création playlist
		// Prend en entrée un nom, et des booléens
		// Si flag_public ou flag_current = true il faut désactiver le flag sur toutes les autres playlists

		// on retourne une promise
		
		return new Promise(function(resolve,reject){
			var NORM_name = S(name).latinise().s;
			var creation_time = timestamp.now();
			var lastedit_time = creation_time;

			if (flag_current == 1 && flag_public == 1) {
				reject('A playlist cannot be current and public at the same time !');
			} else {
				var pUnsetFlagPublic = new Promise((resolve,reject) => {
					if (flag_public == 1) {
						module.exports.unsetPublicAllPlaylists()
							.then(function(){
								resolve();
							})
							.catch(function(err){
								reject(err);
							});
					} else {
						resolve();
					}
				});

				var pUnsetFlagCurrent = new Promise((resolve,reject) => {
					if (flag_current == 1) {
						module.exports.unsetCurrentAllPlaylists()
							.then(function(){
								resolve();
							})
							.catch(function(err){
								reject(err);
							});
					} else {
						resolve();
					}
				});

				Promise.all([pUnsetFlagCurrent,pUnsetFlagPublic])
					.then(function() {
						module.exports.DB_INTERFACE.createPlaylist(name,NORM_name,creation_time,lastedit_time,flag_visible,flag_current,flag_public)
						.then(function(new_id_playlist){
							resolve(new_id_playlist.id);
						})
						.catch(function(err){
							reject(err);
						});
					})
					.catch(function(err) {
						reject(err);
					});
			}
		});
	},
	/**
	* @function {getPlaylistInfo}
	* @param  {number} playlist_id {Playlist ID to fetch}
	* @param  {boolean} seenFromuser {Is the playlist being seen from the user's perspective?}
	* @return {Object} {Playlist object}
	* Returns a playlist object with the following information :
	* - id_playlist
	* - name (name of playlist)
	* - num_karas (Number of karaoke songs in the playlist)
	* - length (duration in seconds of the whole playlist)
	* - creation_time (creation time in UNIX timestamp format)
	* - lastedit_time (last modification time in UNIX timestamp format)
	* - flag_visible (is the playlist visible?)
	* - flag_current (is the playlist the current one?)
	* - flag_public (is the playlist the public one?)
	*/
	getPlaylistInfo:function(playlist_id,seenFromUser) {
		// TODO : Tester si la playlist existe
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.getPlaylistInfo(playlist_id,seenFromUser)
			.then(function(playlist, err){
				if (err) {
					logger.error(err);
					reject(err);
				} else {
					resolve(playlist);
				}
			})
			.catch(function(err){
				reject(err);
			})
		});
	},
	/**
	* @function {getPlaylists}
	* @return {Object} {array of Playlist objects}
	* @param {boolean} seenFromUser {Is the playlist list seen from the user's perspective?}
	* Returns an array of playlist objects to get all playlists :
	* - id_playlist (ID of playlist)
	* - name (name of playlist)
	* - NORM_name (normalized name of playlist)
	* - num_karas (Number of karaoke songs in the playlist)
	* - length (duration in seconds of the whole playlist)
	* - creation_time (creation time in UNIX timestamp format)
	* - lastedit_time (last modification time in UNIX timestamp format)
	* - flag_visible (is the playlist visible?)
	* - flag_current (is the playlist the current one?)
	* - flag_public (is the playlist the public one?)
	*/
	getPlaylists:function(seenFromUser) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.getPlaylists(seenFromUser)
				.then(function(playlists) {
					resolve(playlists);
				})
				.catch(function(err) {
					resolve(err);
				});
		});
	},
	unsetPublicAllPlaylists:function() {
		return new Promise(function(resolve,reject){
			// Désactive le flag Public sur toutes les playlists
			module.exports.DB_INTERFACE.unsetPublicAllPlaylists()
				.then(function(){
					logger.debug('All playlists now have public flag set to 0');
					resolve();
				})
				.catch(function(){
					reject();
				});
		});

	},
	unsetCurrentAllPlaylists:function() {
		return new Promise(function(resolve,reject){
			// Désactive le flag Current sur toutes les playlists
			module.exports.DB_INTERFACE.unsetCurrentAllPlaylists()
				.then(function(){
					logger.debug('All playlists now have current flag set to 0');
					resolve();
				})
				.catch(function(){
					reject();
				});
		});
	},
	/**
	* @function {Update number of karaokes in playlist}
	* @param  {number} playlist_id {ID of playlist to update}
	* @return {number} {number of karaokes found}
	*/
	updatePlaylistNumOfKaras:function(playlist_id) {
		return new Promise(function(resolve,reject) {
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function() {
						reject('Playlist '+playlist_id+' unknown');
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					// Get playlist number of karaokes
					module.exports.DB_INTERFACE.calculatePlaylistNumOfKaras(playlist_id)
						.then(function(num_karas){
							module.exports.DB_INTERFACE.updatePlaylistNumOfKaras(playlist_id,num_karas)
								.then(function(num_karas){
									resolve(num_karas);
								})
								.catch(function(err){
									reject(err);
								});
						})
						.catch(function(err){
							reject(err);
						});
				});
		});
	},
	/**
	* @function {Update playlist's last edit time}
	* @param  {number} playlist_id {ID of playlist to update}
	* @return {boolean} {Promise}
	*/
	updatePlaylistLastEditTime:function(playlist_id) {
		return new Promise(function(resolve,reject) {
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function() {
						reject('Playlist '+playlist_id+' unknown');
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					var lastedit_date = timestamp.now();
					// Update PL's last edit time
					module.exports.DB_INTERFACE.updatePlaylistLastEditTime(playlist_id,lastedit_date)
						.then(function(){
							resolve();
						})
						.catch(function(err){
							reject(err);
						});
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Update duration of a playlist}
	* @param  {number} playlist_id {ID of playlist to update}
	* @return {number} {duration in seconds}
	*/
	updatePlaylistDuration:function(playlist_id) {
		return new Promise(function(resolve,reject) {
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function() {
						reject('Playlist '+playlist_id+' unknown');
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					// Get playlist duration
					module.exports.DB_INTERFACE.calculatePlaylistDuration(playlist_id)
						.then(function(duration){
							if (duration.duration == null) {
								duration.duration = 0;
							}
							module.exports.DB_INTERFACE.updatePlaylistDuration(playlist_id,duration.duration)
								.then(function(duration){
									resolve(duration);
								})
								.catch(function(err){
									reject(err);
								});
						})
						.catch(function(err){
							reject(err);
						});
				});
		});
	},
	/**
	* @function {Get playlist contents}
	* @param  {number} playlist_id {ID of playlist to get contents from}
	* @return {array} {Array of karaoke objects}
	*/
	getPlaylistContents:function(playlist_id,seenFromUser) {
		return new Promise(function(resolve,reject) {
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id,seenFromUser)
					.then(function() {
						resolve();
					})
					.catch(function() {
						reject('Playlist '+playlist_id+' unknown');
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					// Get karaoke list
					module.exports.DB_INTERFACE.getPlaylistContents(playlist_id)
						.then(function(playlist){
							resolve(playlist);
						})
						.catch(function(err){
							reject(err);
						});
				})
				.catch(function(err) {
					reject(err);
				})
		});
	},
	/**
	* @function {Get whitelist contents}
	* @return {array} {Array of karaoke objects}
	*/
	getWhitelistContents:function() {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			module.exports.DB_INTERFACE.getWhitelistContents()
				.then(function(playlist){
					resolve(playlist);
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Get blacklist contents}
	* @return {array} {Array of karaoke objects}
	*/
	getBlacklistContents:function() {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			module.exports.DB_INTERFACE.getBlacklistContents()
				.then(function(playlist){
					resolve(playlist);
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Get blacklist contents}
	* @return {array} {Array of karaoke objects}
	*/
	getBlacklistCriterias:function() {
		return new Promise(function(resolve,reject) {
			// Get list of criterias
			module.exports.DB_INTERFACE.getBlacklistCriterias()
				.then(function(blc){
					resolve(blc);
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Get all karaokes}
	* @return {array} {Array of karaoke objects}
	*/
	getAllKaras:function() {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			module.exports.DB_INTERFACE.getAllKaras()
				.then(function(playlist){
					resolve(playlist);
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Get karaoke by ID}
	* @param  {number} kara_id {ID of karaoke to fetch infos from}
	* @return {Object} {karaoke object}
	*/
	getKara:function(kara_id) {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			module.exports.DB_INTERFACE.getKara(kara_id)
				.then(function(kara){
					resolve(kara);
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Filter playlist with a text}
	* @param  {object} playlist   {playlist array of karaoke objects}
	* @param  {string} searchText {Words separated by a space}
	* @return {object} {playlist array filtered}
	*/
	filterPlaylist:function(playlist,searchText) {
		return new Promise(function(resolve,reject) {
			function textSearch(kara){
				searchText = S(searchText).latinise().s;
				searchText = searchText.toLowerCase();

				var searchOK = [];
				var searchWords = searchText.split(' ');

				var searchWordID = 0;
				searchWords.forEach(function(searchWord) {
					searchOK[searchWordID] = false;
					if (!S(kara.NORM_title).isEmpty()) {
						if (S(kara.NORM_title.toLowerCase()).contains(searchWord)) searchOK[searchWordID] = true;
					}
					if (!S(kara.NORM_series).isEmpty()) {
						if (S(kara.NORM_series.toLowerCase()).contains(searchWord)) searchOK[searchWordID] = true;
					}
					if (!S(kara.NORM_series_altname).isEmpty()) {
						if (S(kara.NORM_series_altname.toLowerCase()).contains(searchWord)) searchOK[searchWordID] = true;
					}
					if (!S(kara.NORM_singer).isEmpty()) {
						if (S(kara.NORM_singer.toLowerCase()).contains(searchWord)) searchOK[searchWordID] = true;
					}
					if (!S(kara.NORM_creator).isEmpty()) {
						if (S(kara.NORM_creator.toLowerCase()).contains(searchWord)) searchOK[searchWordID] = true;
					}					
					if (!S(kara.songtype_i18n_short).isEmpty()) {
						if (S(kara.songtype_i18n_short.toLowerCase()).contains(searchWord))searchOK[searchWordID] = true;
					}
					if (!S(kara.misc_i18n).isEmpty()) {
						if (S(kara.misc_i18n.toLowerCase()).contains(searchWord))searchOK[searchWordID] = true;
					}
					if (!S(kara.language_i18n).isEmpty()) {
						if (S(kara.language_i18n.toLowerCase()).contains(searchWord))searchOK[searchWordID] = true;
					}

					searchWordID++;
				});

				if (searchOK.indexOf(false) > -1 ) {
					return false;
				} else {
					return true;
				}
			}

			var filteredPlaylist = playlist.filter(textSearch);
			resolve(filteredPlaylist);
		});
	},
	/**
	* @function {Add Karaoke to Playlist}
	* @param  {number} kara_id     {ID of karaoke to add}
	* @param  {string} requester   {Name of person submitting karaoke}
	* @param  {number} playlist_id {ID of playlist to add to}
	* @param  {number} pos         {OPTIONAL : Position in playlist}
	* @return {boolean} {Promise}
	* If no position is provided, it will be maximum position in playlist + 1
	*/
	addKaraToPlaylist:function(kara_id,requester,playlist_id,pos) {
		return new Promise(function(resolve,reject){
			var NORM_requester = S(requester).latinise().s;
			var date_add = timestamp.now();
			var flag_playing = 0;
			var isKaraInPlaylist = undefined;
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function() {
						reject('Playlist '+playlist_id+' unknown');
					});
			});
			var pIsKara = new Promise((resolve,reject) => {
				module.exports.isKara(kara_id)
					.then(function() {
						resolve(true);
					})
					.catch(function() {
						reject('Karaoke '+kara_id+' unknown');
					});
			});
			var pIsKaraInPlaylist = new Promise((resolve,reject) => {
				module.exports.isKaraInPlaylist(kara_id,playlist_id)
					.then(function(isKaraInPL) {
						//Karaoke song is in playlist, then we update the boolean and resolve the promise
						//since we don't want duplicates in playlists.
						isKaraInPlaylist = isKaraInPL;
						resolve(isKaraInPL);
					})
					.catch(function(err) {
						reject(err);
					});
			});
			Promise.all([pIsKara,pIsPlaylist,pIsKaraInPlaylist])
				.then(function(){
					if (isKaraInPlaylist) {
						reject('Karaoke song '+kara_id+' is already in playlist '+playlist_id);
					} else {

						// Adding karaoke song here
						module.exports.getKara(kara_id)
							.then(function(kara) {
								var pBuildASS = new Promise((resolve,reject) => {
									assBuilder.build(
										module.exports.SETTINGS.PathSubs,
										module.exports.SETTINGS.PathVideos,
										kara.subfile,
										kara.videofile,
										module.exports.SETTINGS.PathTemp,
										kara.title,
										kara.series,
										kara.songtype,
										kara.songorder,
										requester,
										kara_id,
										playlist_id
									)
										.then(function() {
											resolve();
										})
										.catch(function(err){
											reject(err);
										});
								});
								var pGetPos = new Promise((resolve,reject) => {
									if (pos) {
										resolve();
									} else {
										module.exports.DB_INTERFACE.getMaxPosInPlaylist(playlist_id)
											.then(function(maxpos){
												pos = maxpos + 1.0;
												resolve();
											})
											.catch(function(err){
												reject(err);
											});
									}
								});
								var pRaisePos = new Promise((resolve,reject) => {
									if (pos) {
										module.exports.raisePosInPlaylist(pos,playlist_id)
											.then(function(){
												resolve();
											})
											.catch(function(err){
												reject(err);
											});
									} else {
										resolve();
									}
								});

								Promise.all([pBuildASS,pGetPos,pRaisePos])
									.then(function() {
										module.exports.DB_INTERFACE.addKaraToPlaylist(kara_id,requester,NORM_requester,playlist_id,pos,date_add,flag_playing)
											.then(function(playlistcontent_id){
												var pRenameASS = new Promise((resolve,reject) => {
													fs.renameSync(
														path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathTemp,kara_id+'.'+playlist_id+'.ass'),
														path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathTemp,
															playlistcontent_id+'.ass')
													);
													resolve();
												});
												var pUpdateLastEditTime = new Promise((resolve,reject) => {
													module.exports.updatePlaylistLastEditTime(playlist_id)
														.then(function(){
															resolve();
														})
														.catch(function(err){
															reject(err);
														});
												});
												var pUpdatedDuration = new Promise((resolve,reject) => {
													module.exports.updatePlaylistDuration(playlist_id)
														.then(function(){
															resolve();
														})
														.catch(function(err){
															reject(err);
														});
												});
												var pUpdatedKarasCount = new Promise((resolve,reject) => {
													module.exports.updatePlaylistNumOfKaras(playlist_id)
														.then(function(){
															resolve();
														})
														.catch(function(err){
															reject(err);
														});
												});
												var pReorderPlaylist = new Promise((resolve,reject) => {
													module.exports.reorderPlaylist(playlist_id)
														.then(function(){
															resolve();
														})
														.catch(function(err){
															reject(err);
														});
												});
												Promise.all([pRenameASS,pUpdateLastEditTime,pReorderPlaylist,pUpdatedDuration,pUpdatedKarasCount])
													.then(function() {
														resolve();
													})
													.catch(function(err) {
														reject(err);
													});
											})
											.catch(function(err) {
												reject(err);
											});

									})
									.catch(function(err) {
										reject(err);
									});
							})
							.catch(function(err){
								reject(err);
							});

					}
				})
				.catch(function(err) {
					reject(err);
				});

		});



	},
	/**
	* @function {Remove karaoke from playlist}
	* @param  {number} playlistcontent_id     {ID of karaoke to remove}
	* @return {boolean} {Promise}
	*/
	deleteKaraFromPlaylist:function(playlistcontent_id) {
		return new Promise(function(resolve,reject){
			if (S(playlistcontent_id).isEmpty()) {
				reject('PLCID empty');
			}
			var playlist_id = undefined;
			var kara_id = undefined;
			var pGetPLContentInfo = new Promise((resolve,reject) => {
				module.exports.DB_INTERFACE.getPLContentInfo(playlistcontent_id)
					.then(function(kara) {
						playlist_id = kara.playlist_id;
						kara_id = kara.kara_id;
						resolve();
					})
					.catch(function(err) {
						reject('PLCID '+playlistcontent_id+' unknown : '+err);
					});
			});
			Promise.all([pGetPLContentInfo])
				.then(function() {
				// Removing karaoke here.
					var assFile = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathTemp,
						playlistcontent_id+'.ass');
					if (fs.existsSync(assFile)) {
						fs.unlinkSync(assFile);
						logger.debug('Deleted '+assFile);
					} else {
						logger.warn('Unable to find ASS file : '+assFile);
					}
					module.exports.DB_INTERFACE.removeKaraFromPlaylist(playlistcontent_id)
						.then(function(){
							var pUpdatedDuration = new Promise((resolve,reject) => {
								module.exports.updatePlaylistDuration(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										reject(err);
									});
							});
							var pUpdatedKarasCount = new Promise((resolve,reject) => {
								module.exports.updatePlaylistNumOfKaras(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										reject(err);
									});
							});
							var pUpdateLastEditTime = new Promise((resolve,reject) => {
								module.exports.updatePlaylistLastEditTime(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										reject(err);
									});
							});
							var pReorderPlaylist = new Promise((resolve,reject) => {
								module.exports.reorderPlaylist(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										reject(err);
									});
							});
							Promise.all([pUpdateLastEditTime,pReorderPlaylist,pUpdatedDuration,pUpdatedKarasCount])
								.then(function() {
									resolve();
								})
								.catch(function(err) {
									reject(err);
								});
						})
						.catch(function(err){
							reject(err);
						});
				})
				.catch(function(err) {
					reject(err);
				});

		});



	},
	/**
	* @function {Update karaoke from playlist}
	* @param  {number} playlistcontent_id     {ID of karaoke to remove}
	* @param  {number} pos {New position of karaoke, optional}
	* @param  {boolean} flag_playing {Is the karaoke currently the playing one?}
	* @return {boolean} {Promise}
	*/
	editKaraFromPlaylist:function(playlistcontent_id,pos,flag_playing) {
		return new Promise(function(resolve,reject){
			if (S(playlistcontent_id).isEmpty()) {
				reject('PLCID empty');
			}
			var playlist_id = undefined;
			var pGetPLContentInfo = new Promise((resolve,reject) => {
				module.exports.DB_INTERFACE.getPLContentInfo(playlistcontent_id)
					.then(function(kara) {
						playlist_id = kara.playlist_id;
						resolve();
					})
					.catch(function(err) {
						reject('PLCID '+playlistcontent_id+' unknown : '+err);
					});
			});
			Promise.all([pGetPLContentInfo])
				.then(function() {
					// Updating karaoke here.
					var pUpdatePlaying = new Promise((resolve,reject) => {
						if (flag_playing) {
							module.exports.DB_INTERFACE.setPlaying(playlistcontent_id,playlist_id)
								.then(function(){
									module.exports.isCurrentPlaylist(playlist_id)
										.then(function(res){
											if (res == true) {
												module.exports.onPlayingUpdated()
													.then(function(){
														resolve();
													})
													.catch(function(err){
														reject(err);
													})
											} else {
												resolve();
											}											
										})
										.catch(function(err){
											reject(err);
										});
								})
								.catch(function(err){
									reject(err);
								});
						} else {
							resolve();
						}
					});
					var pUpdatePos = new Promise((resolve,reject) => {
						if (pos) {
							module.exports.raisePosInPlaylist(pos,playlist_id)
								.then(function(){
									module.exports.DB_INTERFACE.setPos(playlistcontent_id,pos)
										.then(function(){
											resolve();
										})
										.catch(function(err){
											reject(err);
										});
								})
								.catch(function(err){
									reject(err);
								});
						} else {
							resolve();
						}
					});
					Promise.all([pUpdatePos,pUpdatePlaying])
						.then(function(){
							var pReorderPlaylist = new Promise((resolve,reject) => {
								module.exports.reorderPlaylist(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										reject(err);
									});
							});
							var pUpdateLastEditTime = new Promise((resolve,reject) => {
								module.exports.updatePlaylistLastEditTime(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										reject(err);
									});
							});
							Promise.all([pUpdateLastEditTime,pReorderPlaylist])
								.then(function() {
									resolve();
								})
								.catch(function(err) {
									reject(err);
								});
						})
						.catch(function(err) {
							reject(err);
						});
				})
				.catch(function(err) {
					reject(err);
				});
		});
	},
	/**
	* @function {Remove karaoke from whitelist}
	* @param  {number} wlc_id     {ID of karaoke to remove}
	* @return {boolean} {Promise}
	*/
	deleteKaraFromWhitelist:function(wlc_id) {
		return new Promise(function(resolve,reject){
			if (S(wlc_id).isEmpty()) {
				reject('WLCID empty');
			}
			// Removing karaoke here.
			module.exports.DB_INTERFACE.removeKaraFromWhitelist(wlc_id)
				.then(function(){
					module.exports.generateBlacklist()
						.then(function(){
							resolve();
						})
						.catch(function(err){
							reject(err);
						});
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Raises position of kara in a playlist}
	* @param  {number} playlist_id     {ID of playlist to modify order of}
	* @param  {number} order           {Order to raise}
	* @return {boolean} {Promise}
	* This utility function raises the position of a song in a playlist by 0.1
	* This allows the reorderPlaylist function, called immediately after, to
	* reorder the new playlist correctly.
	*/
	raisePosInPlaylist:function(pos,playlist_id) {
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.raisePosInPlaylist(pos,playlist_id)
				.then(function() {
					resolve();
				})
				.catch(function(err) {
					reject(err);
				});
		});
	},
	/**
	* @function {reorders a playlist by updating karaoke positions}
	* @param  {number} playlist_id {ID of playlist to sort}
	* @return {array} {Playlist array of karaoke objects.}
	*/
	reorderPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function() {
						reject('Playlist '+playlist_id+' unknown');
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					module.exports.getPlaylistContents(playlist_id)
						.then(function(playlist){
							playlist.sort(function(a,b){
								return a.pos - b.pos;
							});
							var newpos = 0;
							var arraypos = 0;
							playlist.forEach(function(kara){
								newpos++;
								playlist[arraypos].pos = newpos;
								arraypos++;
							});

							module.exports.DB_INTERFACE.reorderPlaylist(playlist_id,playlist)
								.then(function() {
									resolve(playlist);
								})
								.catch(function(err) {
									reject(err);
								});
						})
						.catch(function(err){
							reject(err);
						});
				})
				.catch(function(err) {
					reject(err);
				});
		});
	},
	/**
	* @function {Translate Kara Information}
	* @param  {type} karalist {list of kara objects}
	* @param  {type} lang     {language in ISO639-1 to translate into}
	* @return {object} {Returns array of kara objects}
	*/
	translateKaraInfo:function(karalist,lang){
		return new Promise(function(resolve,reject) {

			// If lang is not provided, assume we're using node's system locale
			if (!lang) lang = module.exports.SETTINGS.EngineDefaultLocale;
			// Test if lang actually exists in ISO639-1 format
			if (!langs.has('1',lang)) {
				reject('Unknown language : '+lang);
			}
			// Instanciate a translation object for our needs with the correct language.
			const i18n = require('i18n'); // Needed for its own translation instance
			i18n.configure({
				directory: path.resolve(__dirname,'../../_common/locales'),
			});
			i18n.setLocale(lang);

			// We need to read the detected locale in ISO639-1
			var detectedLocale = langs.where('1',lang);

			// If the kara list provided is not an array (only a single karaoke)
			// Put it into an array first
			var karas;
			if (karalist.constructor != Array) {
				karas = [];
				karas[0] = karalist;
			} else {
				karas = karalist;
			}

			karas.forEach(function(kara,index) {
				karas[index].songtype_i18n = i18n.__(kara.songtype);
				karas[index].songtype_i18n_short = i18n.__(kara.songtype+'_SHORT');

				if (kara.language != null) {
					var karalangs = kara.language.split(',');
					var languages = [];
					karalangs.forEach(function(karalang,index){
						// Special case : und
						// Undefined language
						// In this case we return something different.
						if (karalang === 'und') {
							languages.push(i18n.__('UNDEFINED_LANGUAGE'));
						} else {
							// We need to convert ISO639-2B to ISO639-1 to get its language
							var langdata = langs.where('2B',karalang);
							if (langdata === undefined) {
								languages.push(__('UNKNOWN_LANGUAGE'));
							} else {
								languages.push(isoCountriesLanguages.getLanguage(detectedLocale[1],langdata[1]));
							}

						}
					});
					karas[index].language_i18n = languages.join();
				}
				// Let's do the same with tags, without language stuff
				if (kara.misc != null) {
					var tags = [];
					var karatags = kara.misc.split(',');
					karatags.forEach(function(karatag,index){
						tags.push(i18n.__(karatag));
					});
					karas[index].misc_i18n = tags.join();
				} else {
					karas[index].misc_i18n = null;
				}
			});
			resolve(karas);
		});
	},
	/**
	* @function {Shuffles playlist}
	* @param  {number} playlist_id {ID of playlist to shuffle}
	* @return {array} {Playlist array of karaoke objects.}
	*/
	shufflePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						reject('Playlist '+playlist_id+' unknown : '+err);
					});
			});
			// We check if the playlist to shuffle is the current one. If it is, we will only shuffle
			// the part after the song currently being played.
			var IsCurrent = undefined;
			var pIsCurrent = new Promise((resolve,reject) => {
				module.exports.isCurrentPlaylist(playlist_id)
					.then(function(res){
						if (res == true) {
							IsCurrent = true;
						} else {
							IsCurrent = false;
						}
						resolve();
					})
					.catch(function(err){
						reject(err);
					});
			});
			Promise.all([pIsPlaylist,pIsCurrent])
				.then(function() {
					module.exports.getPlaylistContents(playlist_id)
						.then(function(playlist){
							if (IsCurrent === false) {
								shuffle(playlist);
							} else  {
							// If it's current playlist, we'll make two arrays out of the playlist :
							// One before (and including) the current song being played (flag_playing = 1)
							// One after.
							// We'll shuffle the one after then concatenate the two arrays.
								var BeforePlaying = [];
								var AfterPlaying = [];
								var ReachedPlaying = false;
								playlist.forEach(function(kara){
									if (ReachedPlaying == false) {
										BeforePlaying.push(kara);
										if (kara.flag_playing == 1) {
											ReachedPlaying = true;
										}
									} else {
										AfterPlaying.push(kara);
									}
								});
								shuffle(AfterPlaying);
								playlist = BeforePlaying.concat(AfterPlaying);
							}
							var newpos = 0;
							var arraypos = 0;
							playlist.forEach(function(kara){
								newpos++;
								playlist[arraypos].pos = newpos;
								arraypos++;
							});
							var pUpdateLastEditTime = new Promise((resolve,reject) => {
								module.exports.updatePlaylistLastEditTime(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										reject(err);
									});
							});
							var pReorderPlaylist = new Promise((resolve,reject) => {
								module.exports.DB_INTERFACE.reorderPlaylist(playlist_id,playlist)
									.then(function() {
										resolve();
									})
									.catch(function(err) {
										reject(err);
									});
							});
							Promise.all([pReorderPlaylist,pUpdateLastEditTime])
								.then(function() {
									resolve();
								})
								.catch(function(err) {
									reject(err);
								});
						})
						.catch(function(err){
							reject(err);
						});
				})
				.catch(function(err) {
					reject(err);
				});
		});
	},
	/**
	* @function {Add Karaoke to Public playlist}
	* @param  {number} kara_id     {ID of karaoke to add}
	* @param  {string} requester   {Name of person submitting karaoke}
	* @return {boolean} {Promise}
	*/
	addKaraToPublicPlaylist:function(kara_id,requester) {
		return new Promise(function(resolve,reject){
			var NORM_requester = S(requester).latinise().s;
			var date_add = timestamp.now();
			var flag_playing = 0;
			var isKaraInPlaylist = undefined;
			var isKaraBlacklisted = undefined;
			var publicPlaylistID = undefined;
			var pWhichPublicPlaylist = new Promise((resolve,reject) => {
				module.exports.isAPublicPlaylist()
					.then(function(playlist_id) {
						publicPlaylistID = playlist_id;
						resolve(true);
					})
					.catch(function() {
						reject('Public playlist not found');
					});
			});
			var pIsKara = new Promise((resolve,reject) => {
				module.exports.isKara(kara_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						reject('Karaoke '+kara_id+' unknown : '+err);
					});
			});
			Promise.all([pIsKara,pWhichPublicPlaylist])
				.then(function() {
					var pIsKaraInPlaylist = new Promise((resolve,reject) => {
						module.exports.isKaraInPlaylist(kara_id,publicPlaylistID)
							.then(function(isKaraInPL) {
								//Karaoke song is in playlist, then we update the boolean and resolve the promise
								//since we don't want duplicates in playlists.
								isKaraInPlaylist = isKaraInPL;
								resolve(isKaraInPL);
							})
							.catch(function(err) {
								reject(err);
							});
					});
					var pIsKaraBlacklisted = new Promise((resolve,reject) => {
						module.exports.isKaraInBlacklist(kara_id)
						.then(function(isKaraInBL){
							isKaraBlacklisted = isKaraInBL;
							resolve();
						})
						.catch(function(){
							reject();
						});
					});
					Promise.all([pIsKaraInPlaylist,pIsKaraBlacklisted])
						.then(function() {							
							if (isKaraInPlaylist) {
								reject('Karaoke song '+kara_id+' is already in playlist '+publicPlaylistID);
							} else if(isKaraBlacklisted) {
								reject('Karaoke '+kara_id+' is blacklisted');
							} else {
								// Adding karaoke song here
								module.exports.getKara(kara_id)
									.then(function(kara) {
										var pos = 0;
										var pBuildASS = new Promise((resolve,reject) => {

											assBuilder.build(
												module.exports.SETTINGS.PathSubs,
												module.exports.SETTINGS.PathVideos,
												kara.subfile,
												kara.videofile,
												module.exports.SETTINGS.PathTemp,
												kara.title,
												kara.series,
												kara.songtype,
												kara.songorder,
												requester,
												kara_id,
												publicPlaylistID)
												.then(function() {
													resolve();
												})
												.catch(function(err){
													reject(err);
												});
										});
										var pGetPos = new Promise((resolve,reject) => {
											module.exports.DB_INTERFACE.getMaxPosInPlaylist(publicPlaylistID)
												.then(function(maxpos){
													if (maxpos) {
														pos = maxpos + 1.0;
													} else {
														pos = 1;
													}
													resolve();
												})
												.catch(function(err){
													reject(err);
												});

										});

										Promise.all([pBuildASS,pGetPos])
											.then(function() {
												module.exports.DB_INTERFACE.addKaraToPlaylist(kara_id,requester,NORM_requester,publicPlaylistID,pos,date_add,flag_playing)
													.then(function(playlistcontent_id){
														var pRenameASS = new Promise((resolve,reject) => {
															fs.renameSync(
																path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathTemp,kara_id+'.'+publicPlaylistID+'.ass'),
																path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathTemp,
																	playlistcontent_id+'.ass')
															);
															resolve();
														});
														var pUpdatedDuration = new Promise((resolve,reject) => {
															module.exports.updatePlaylistDuration(publicPlaylistID)
																.then(function(){
																	resolve();
																})
																.catch(function(err){
																	reject(err);
																});
														});
														var pUpdatedKarasCount = new Promise((resolve,reject) => {
															module.exports.updatePlaylistNumOfKaras(publicPlaylistID)
																.then(function(){
																	resolve();
																})
																.catch(function(err){
																	reject(err);
																});
														});
														var pReorderPlaylist = new Promise((resolve,reject) => {
															module.exports.reorderPlaylist(publicPlaylistID)
																.then(function(){
																	resolve();
																})
																.catch(function(err){
																	reject(err);
																});
														});
														var pUpdatedPlaylistLastEditTime = new Promise((resolve,reject) => {
															module.exports.updatePlaylistLastEditTime(publicPlaylistID)
																.then(function(){
																	resolve();
																})
																.catch(function(err){
																	reject(err);
																});
														});
														Promise.all([pRenameASS,pUpdatedPlaylistLastEditTime,pReorderPlaylist,pUpdatedDuration,pUpdatedKarasCount])
															.then(function() {
																resolve();
															})
															.catch(function(err) {
																reject(err);
															});
													})
													.catch(function(err) {
														reject(err);
													});

											})
											.catch(function(err) {
												reject(err);
											});

									})
									.catch(function(err) {
										reject(err);
									});
							}
						})
						.catch(function(err) {
							reject(err);
						});
				})
				.catch(function(err) {
					reject(err);
				});
		});
	},
	/**
	* @function {Add Karaoke to Current playlist}
	* @param  {number} kara_id     {ID of karaoke to add}
	* @param  {string} requester   {Name of person submitting karaoke}
	* @param  {number} pos         {OPTIONAL : Position in playlist}
	* @return {boolean} {Promise}
	*/
	addKaraToCurrentPlaylist:function(kara_id,requester,pos) {
		return new Promise(function(resolve,reject){
			var NORM_requester = S(requester).latinise().s;
			var date_add = timestamp.now();
			var flag_playing = 0;
			var isKaraInPlaylist = undefined;
			var currentPlaylistID = undefined;
			var pWhichCurrentPlaylist = new Promise((resolve,reject) => {
				module.exports.isACurrentPlaylist()
					.then(function(playlist_id) {
						currentPlaylistID = playlist_id;
						resolve(true);
					})
					.catch(function() {
						reject('Current playlist not found');
					});
			});
			var pIsKara = new Promise((resolve,reject) => {
				module.exports.isKara(kara_id)
					.then(function() {
						resolve(true);
					})
					.catch(function() {
						reject('Karaoke '+kara_id+' unknown');
					});
			});
			Promise.all([pIsKara,pWhichCurrentPlaylist])
				.then(function() {
					var pIsKaraInPlaylist = new Promise((resolve,reject) => {
						module.exports.isKaraInPlaylist(kara_id,currentPlaylistID)
							.then(function(isKaraInPL) {
								//Karaoke song is in playlist, then we update the boolean and resolve the promise
								//since we don't want duplicates in playlists.
								isKaraInPlaylist = isKaraInPL;
								resolve(isKaraInPL);
							})
							.catch(function(err) {
								reject(err);
							});
					});
					var pIsKaraBlacklisted = new Promise((resolve,reject) => {
						module.exports.isKaraInBlacklist(kara_id)
						.then(function(isKaraInBL){
							isKaraBlacklisted = isKaraInBL;
							resolve();
						})
						.catch(function(){
							reject();
						});
					});
					Promise.all([pIsKaraInPlaylist,pIsKaraBlacklisted])
						.then(function() {							
							if (isKaraInPlaylist) {
								reject('Karaoke song '+kara_id+' is already in playlist '+publicPlaylistID);
							} else if(isKaraBlacklisted) {
								reject('Karaoke '+kara_id+' is blacklisted');
							} else {
								// Adding karaoke song here
								module.exports.getKara(kara_id)
									.then(function(kara) {
										var pos = 0;
										var pBuildASS = new Promise((resolve,reject) => {

											assBuilder.build(
												module.exports.SETTINGS.PathSubs,
												module.exports.SETTINGS.PathVideos,
												kara.subfile,
												kara.videofile,
												module.exports.SETTINGS.PathTemp,
												kara.title,
												kara.series,
												kara.songtype,
												kara.songorder,
												requester,
												kara_id,
												currentPlaylistID
											)
												.then(function() {
													resolve();
												})
												.catch(function(err){
													reject(err);
												});
										});
										var pGetPos = new Promise((resolve,reject) => {
											module.exports.DB_INTERFACE.getMaxPosInPlaylist(currentPlaylistID)
												.then(function(maxpos){
													if (maxpos) {
														pos = maxpos + 1.0;
													} else {
														pos = 1;
													}
													resolve();
												})
												.catch(function(err){
													reject(err);
												});

										});

										Promise.all([pBuildASS,pGetPos])
											.then(function() {
												module.exports.DB_INTERFACE.addKaraToPlaylist(kara_id,requester,NORM_requester,currentPlaylistID,pos,date_add,flag_playing)
													.then(function(playlistcontent_id){
														var pRenameASS = new Promise((resolve,reject) => {
															fs.renameSync(
																path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,kara_id+'.'+currentPlaylistID+'.ass'),
																path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,
																	playlistcontent_id+'.ass')
															);
															resolve();
														});
														var pUpdatedDuration = new Promise((resolve,reject) => {
															module.exports.updatePlaylistDuration(currentPlaylistID)
																.then(function(){
																	resolve();
																})
																.catch(function(err){
																	reject(err);
																});
														});
														var pUpdatedKarasCount = new Promise((resolve,reject) => {
															module.exports.updatePlaylistNumOfKaras(currentPlaylistID)
																.then(function(){
																	resolve();
																})
																.catch(function(err){
																	reject(err);
																});
														});
														var pUpdatedPlaylistLastEditTime = new Promise((resolve,reject) => {
															module.exports.updatePlaylistLastEditTime(currentPlaylistID)
																.then(function(){
																	resolve();
																})
																.catch(function(err){
																	reject(err);
																});
														});
														var pReorderPlaylist = new Promise((resolve,reject) => {
															module.exports.reorderPlaylist(currentPlaylistID)
																.then(function(){
																	resolve();
																})
																.catch(function(err){
																	reject(err);
																});
														});
														Promise.all([pRenameASS,pReorderPlaylist,pUpdatedPlaylistLastEditTime,pUpdatedDuration,pUpdatedKarasCount])
															.then(function() {
																resolve();
															})
															.catch(function(err) {
																reject(err);
															});
													})
													.catch(function(err) {
														reject(err);
													});

											})
											.catch(function(err) {
												reject(err);
											});
									})
									.catch(function(err) {
										reject(err);
									});
							}
						})
						.catch(function(err) {
							reject(err);
						});
				})
				.catch(function(err) {
					reject(err);
				});
		});
	},

	// ---------------------------------------------------------------------------
	// Methodes rapides de gestion de la playlist courante
	// prev / next / get_current
	// ---------------------------------------------------------------------------

	prev:function(){
		return new Promise(function(resolve,reject){
			module.exports.isACurrentPlaylist().then(function(playlist_id){
				module.exports.getPlaylistContents(playlist_id).then(function(pl_content){
					if(pl_content.length==0) {
						reject();
					} else {
						var readpos = 0;
						pl_content.forEach(function(element, index) {
							if(element.flag_playing) {
								readpos = index-1;
							}
						});
						// on est au début de la playlist
						if(readpos<0) {
							reject();
						}

						var kara = pl_content[readpos];
						if(kara) {
							// mise à jour du pointeur de lecture
							module.exports.DB_INTERFACE._user_db_handler.run('UPDATE playlist_content SET flag_playing=0;',function(){
								module.exports.DB_INTERFACE._user_db_handler.run('UPDATE playlist_content SET flag_playing=1 WHERE pk_idplcontent = '+kara.playlistcontent_id+';');
							});
							resolve();
						}
						reject();
					}
				});
			}).catch(function(error_message){
				reject(error_message);
			});
		});
	},
	next:function(){
		return new Promise(function(resolve,reject){
			module.exports.isACurrentPlaylist().then(function(playlist_id){
				module.exports.getPlaylistContents(playlist_id).then(function(pl_content){
					if(pl_content.length==0) {
						reject();
					} else {
						var readpos = 0;
						pl_content.forEach(function(element, index) {
							if(element.flag_playing)
								readpos = index+1;
						});
						// on est la fin de la playlist
						if(readpos >= pl_content.length)
							reject();

						var kara = pl_content[readpos];
						if(kara) {
							// mise à jour du pointeur de lecture
							module.exports.DB_INTERFACE._user_db_handler.run('UPDATE playlist_content SET flag_playing=0;',function(){
								module.exports.DB_INTERFACE._user_db_handler.run('UPDATE playlist_content SET flag_playing=1 WHERE pk_idplcontent = '+kara.playlistcontent_id+';');
							});
							resolve();
						}
						reject();
					}
				});
			}).catch(function(error_message){
				reject(error_message);
			});
		});
	},
	current_playlist:function(){
		return new Promise(function(resolve,reject){
			module.exports.isACurrentPlaylist()
				.then(function(playlist_id){
					module.exports.getPlaylistContents(playlist_id).then(function(pl_content){
						var readpos = false;
						pl_content.forEach(function(element, index) {
							if(element.flag_playing)
								readpos = index;
						});
						resolve({'id':playlist_id,content:pl_content,index:readpos});
					});
				})
				.catch(function(error_message){
					reject(error_message);
				});
		});
	},
	current:function(){
		// TODO : renommer en get_current_kara
		// implémenter des méthode next et prev
		// et coder sur engine en fin de morceau (event venant du player) => passer au morceau suivant avant de récupérer le morceau courant
		// => next'n play
		return new Promise(function(resolve,reject){
			module.exports.current_playlist()
				.then(function(playlist){					
					var readpos = false;
					playlist.content.forEach(function(element, index) {
						if(element.flag_playing)
							readpos = index;
					});

					var update_playing_kara = false;
					if(readpos===false) {
						readpos = 0;
						update_playing_kara = true;
					}

					var kara = playlist.content[readpos];
					if(kara) {
						// si il n'y avait pas de morceau en lecture on marque le premier de la playlist
						if(update_playing_kara) {
							// mise à jour du pointeur de lecture
							module.exports.DB_INTERFACE._user_db_handler.run('UPDATE playlist_content SET flag_playing=0;',function(){
								module.exports.DB_INTERFACE._user_db_handler.run('UPDATE playlist_content SET flag_playing=1 WHERE pk_idplcontent = '+kara.playlistcontent_id+';');
							});
						}

						// on enrichie l'objet pour fournir son contexte et les chemins système prêt à l'emploi
						kara.playlist_id = playlist.id;
						kara.path = {
							video: path.join(module.exports.SYSPATH,module.exports.SETTINGS.PathVideos, kara.videofile),
							subtitle: path.join(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp, kara.playlistcontent_id+'.ass'),
						};						
						resolve(kara);
					} else { 							
						reject('No kara found in playlist object');
					}
				})
				.catch(function(err){
					logger.error(err);
					reject('meh');
				})
		});
	},

	build_dummy_current_iterate_index:1,
	build_dummy_current_iterate:function(playlist_id,resolve,reject) {
		console.log('Adding Kara '+module.exports.build_dummy_current_iterate_index+' into dummy playlist');
		module.exports.addKaraToPlaylist(
			module.exports.build_dummy_current_iterate_index,
			'Dummy user '+module.exports.build_dummy_current_iterate_index,
			playlist_id
		)
			.then(function(){
				module.exports.build_dummy_current_iterate_index++;
				if(module.exports.build_dummy_current_iterate_index<=10)
					module.exports.build_dummy_current_iterate(playlist_id,resolve,reject);
				else
					resolve();
			})
			.catch(function(message){
				reject(message);
			});
	},

	build_dummy_current_playlist:function(playlist_id){
		console.log('build_dummy_current_playlist');
		return new Promise(function(resolve,reject){
			module.exports.build_dummy_current_iterate(playlist_id,resolve,reject);
		});
	},

	// ---------------------------------------------------------------------------
	// Evenements à référencer par le composant  parent
	// ---------------------------------------------------------------------------

	onPlaylistUpdated:function(){
		// événement émis pour quitter l'application
		logger.error('_engine/components/playlist_controller.js :: onPlaylistUpdated not set');
	},
	onPlayingUpdated:function(){
		// event when the playing flag is changed in the current playlist
	}
};