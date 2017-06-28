const path = require('path');
const logger = require('../_common/utils/logger.js');
logger.SOURCE = '_engine/index.js';

module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	DB_INTERFACE:null,
	_states:{
		status:'stop', // [stop,play] // etat générale de l'application Karaoke - STOP => la lecture de la playlist est interrompu
		private:true, // [bool(true|false)] // Karaoke en mode privé ou publique
	},
	_services:{
		admin: null,
		playlist_controller: null,
		player:null,
	},

	run: function(){
		// méthode de démarrage de base
		if(this.SYSPATH === null)
		{
			logger.error('SYSPATH is null');
			process.exit();
		}
		if(this.SETTINGS === null)
		{
			logger.error('SETTINGS is null');
			process.exit();
		}

		this._start_db_interface();
		this._start_player();
		this._start_playlist_controller();
		this._start_admin();
		this._broadcastStates();
	},
	exit:function(){
		// coupe tout le système
		process.exit();
	},

	play:function(){
		if(module.exports._states.status !== 'play')
		{
			// passe en mode lecture (le gestionnaire de playlist vas travailler à nouveau)
			module.exports._states.status = 'play';
			module.exports._broadcastStates();

			module.exports.tryToReadNextKaraInPlaylist();
		}
		else if(module.exports._states.status === 'play')
		{
			// resume current play if needed
			module.exports._services.player.resume();
		}
	},
	stop:function(now){
		if(now)
			module.exports._services.player.stop();

		if(module.exports._states.status !== 'stop')
		{
			module.exports._states.status = 'stop';
			module.exports._broadcastStates();
		}
	},
	pause:function(){
		module.exports._services.player.pause()
		// l'état globale n'a pas besoin de changer
		// le player ne terminera jamais son morceau en restant en pause
		module.exports._broadcastStates();
	},

	setPrivateOn:function()
	{
		module.exports._states.private = true;
		module.exports._broadcastStates();
	},
	setPrivateOff:function()
	{
		module.exports._states.private = false;
		module.exports._broadcastStates();
	},
	togglePrivate:function()
	{
		module.exports._states.private = !module.exports._states.private;
		logger.success('private is now '+module.exports._states.private);
		module.exports._broadcastStates();
	},

	// Methode lié à la lecture de kara
	playlistUpdated:function(){
		module.exports.tryToReadNextKaraInPlaylist();
	},
	playerEnding:function(){
		module.exports.tryToReadNextKaraInPlaylist();
	},

	tryToReadNextKaraInPlaylist:function(){
		if(module.exports._states.status === 'play' && !module.exports._services.player.playing)
		{
			kara = module.exports._services.playlist_controler.get_next_kara();
			if(kara)
			{
				logger.success('next kara is '+kara.title);
				module.exports._services.player.play(
					kara.videofile,
					kara.subfile,
					kara.kara_id
				);
			}
			logger.warning('next kara is not available');
			module.exports._broadcastPlaylist();
		}
	},

	// ------------------------------------------------------------------
	// méthodes privées
	// ------------------------------------------------------------------

	_broadcastStates:function()
	{
		// diffuse l'état courant à tout les services concerné (normalement les webapp)
		module.exports._services.admin.setEngineStates(module.exports._states);
	},

	_broadcastPlaylist:function()
	{
		// récupère la playlist à jour et la diffuser vers les services concerné (normalement les webapp)
	},

	// ------------------------------------------------------------------
	// methodes de démarrage des services
	// ------------------------------------------------------------------

	_start_db_interface: function()
	{
		module.exports.DB_INTERFACE = require(path.resolve(__dirname,'components/db_interface.js'));
		module.exports.DB_INTERFACE.SYSPATH = module.exports.SYSPATH;
		module.exports.DB_INTERFACE.init();
	},
	_start_admin:function(){
		module.exports._services.admin = require(path.resolve(__dirname,'../_admin/index.js'));
		module.exports._services.admin.LISTEN = 1338;
		module.exports._services.admin.SYSPATH = module.exports.SYSPATH;
		module.exports._services.admin.SETTINGS = module.exports.SETTINGS;
		module.exports._services.admin.DB_INTERFACE = module.exports.DB_INTERFACE;
		// --------------------------------------------------------
		// diffusion des méthodes interne vers les events admin
		// --------------------------------------------------------
		module.exports._services.admin.onTerminate = module.exports.exit;
		// Evenement de changement bascule privé/publique
		module.exports._services.admin.onTogglePrivate = module.exports.togglePrivate;
		// Supervision des évènement de changement de status (play/stop)
		module.exports._services.admin.onPlay = module.exports.play;
		module.exports._services.admin.onStop = module.exports.stop;
		module.exports._services.admin.onStopNow = function(){module.exports.stop(true)};
		// --------------------------------------------------------
		// on démarre ensuite le service
		module.exports._services.admin.init();
		// et on lance la commande pour ouvrir la page web
		module.exports._services.admin.open();
	},
	_start_playlist_controller:function(){
			.then(function (new_playlist){
				logger.success("New playlist created with ID : "+new_playlist.id);
			})
			.catch(function(err){
				logger.error("New playlist fail : "+err);
			});
		*/
		this._services.playlist_controller.deletePlaylist(34,35)
		    .then(function (old_playlist,new_curorpubplaylist){
				logger.success("Playlist "+playlist.id+" deleted. Transferred flags to "+new_curorpubplaylist);
			})
			.catch(function(err){
				logger.error("Deleting playlist failed : "+err);
			});			
		// on ajoute 4 morceau dans la playlist
		module.exports._services.playlist_controller.addKara(1,'toto');
		module.exports._services.playlist_controller.addKara(2,'tata');
		module.exports._services.playlist_controller.addKara(3,'titi');
		module.exports._services.playlist_controller.addKara(4,'tutu');
	},
	_start_player:function()
	{
		module.exports._services.player = require(path.resolve(__dirname,'../_player/index.js'));
		module.exports._services.player.BINPATH = path.resolve(module.exports.SYSPATH,'app/bin');
		module.exports._services.player.onEnd = module.exports.playerEnding;
		module.exports._services.player.init();
	}
}