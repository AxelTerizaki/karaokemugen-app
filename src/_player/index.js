var fs = require('fs');
var path = require('path');

module.exports = {
	playing:false,
	_playing:false, // internal delay flag
	_player:null,
	_ref:null,
	BINPATH:null,
	init:function(){
		if(!fs.existsSync(module.exports.BINPATH)){
			console.log('Unable to found mpv.exe');
			console.log('Received path was : '+module.exports.BINPATH);
			process.exit();
		}

		var mpvAPI = require('node-mpv');
		module.exports._player = new mpvAPI({
			audio_only: false,
			binary: path.join(module.exports.BINPATH,'mpv.exe'),
			socket: '\\\\.\\pipe\\mpvsocket',
			time_update: 1,
			verbose: false,
			debug: false,
		},
		[
			//"--fullscreen",
			"--no-border",
			"--keep-open=yes",
			"--idle=yes",
			"--fps=60",
			"--screen=1",
		]);

		module.exports._player.on('statuschange',function(status){
			if(module.exports._playing && status && status.filename && status.filename.match(/__blank__/))
			{
				// immediate switch to Playing = False to avoid multiple trigger
				module.exports.playing = false;
				module.exports._playing = false;
				module.exports._player.pause();
				module.exports.onEnd(module.exports._ref);
				module.exports._ref = null;
			}
		});
	},
	play: function(video,subtitle,reference){
		module.exports.playing = true;
		if(fs.existsSync(video)){
			console.log('playing : '+video);
			module.exports._ref = reference;
			module.exports._player.loadFile(video);
			module.exports._player.volume(70);
			module.exports._player.play();
			// video may need some delay to play
			setTimeout(function(){
				module.exports._playing = true;
				if(subtitle)
				{
					if(fs.existsSync(subtitle)){
						console.log('subtitle : '+subtitle);
						module.exports._player.addSubtitles(subtitle);//, flag, title, lang)
					}
					else
					{
						console.log('Can not find subtitle '+subtitle)
					}
				}
				else
				{
					console.log('No subtitles');
				}
				module.exports._player.loadFile(path.join(__dirname,'assets/__blank__.png'),'append');
			},500);
		}
		else {
			module.exports.playing = false;
			console.log('Can not find video '+video)
		}
	},
	stop:function()
	{
		module.exports._player.loadFile(path.join(__dirname,'assets/__blank__.png'));
	},
	pause: function(){
		console.log(module.exports._player);
		module.exports._player.pause();
	},
	resume: function(){
		module.exports._player.play();
	},
	onEnd:function(){
		// événement émis pour quitter l'application
		console.log('_player/index.js :: onEnd not set')
	},
};