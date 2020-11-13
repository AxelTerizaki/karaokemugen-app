import { profile } from 'console';
import merge from 'lodash.merge';

import { APIMessage } from '../controllers/common';
import { setPLCVisible, updatePlaylistDuration } from '../dao/playlist';
import { getConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { emitWS } from '../lib/utils/ws';
import { CurrentSong } from '../types/playlist';
import sentry from '../utils/sentry';
import { getState, setState } from '../utils/state';
import { addPlayedKara, getKara, getKaras, getSeriesSingers } from './kara';
import { mpv, next, restartPlayer, stopAddASongMessage, stopPlayer } from './player';
import { getCurrentSong, getPlaylistInfo, getPlaylistContentsMini, shufflePlaylist, updateUserQuotas } from './playlist';
import { startPoll } from './poll';

export async function playSingleSong(kid?: string, randomPlaying = false) {
	try {
		const kara = await getKara(kid, {username: 'admin', role: 'admin'});
		if (!kara) throw {code: 404, msg: 'KID not found'};
		const current: CurrentSong = merge(kara, {nickname: 'Admin', flag_playing: true, pos: 1, flag_free: false, flag_visible: false, username: 'admin', repo: kara.repository, playlistcontent_id: -1, playlist_id: -1});
		setState({singlePlay: !randomPlaying, currentSong: current, randomPlaying: randomPlaying});
		if (!randomPlaying) {
			stopAddASongMessage();
		}
		logger.debug('Karaoke selected', {service: 'Player', obj: kara});
		logger.info(`Playing ${kara.mediafile.substring(0, kara.mediafile.length - 4)}`, {service: 'Player'});
		// If series is empty, pick singer information instead
		const series = getSeriesSingers(kara);

		// If song order is 0, don't display it (we don't want things like OP0, ED0...)
		let songorder = `${kara.songorder}`;
		if (!kara.songorder || kara.songorder === 0) songorder = '';
		// Construct mpv message to display.
		const infos = '{\\bord0.7}{\\fscx70}{\\fscy70}{\\b1}'+series+'{\\b0}\\N{\\i1}' +kara.songtypes.map(s => s.name).join(' ')+songorder+' - '+kara.title+'{\\i0}';
		await mpv.play({
			media: kara.mediafile,
			subfile: kara.subfile,
			gain: kara.gain,
			infos: infos,
			currentSong: kara,
			avatar: null,
			duration: kara.duration,
			repo: kara.repository,
			spoiler: kara.misc && kara.misc.some(t => t.name === 'Spoiler')
		});
		setState({currentlyPlayingKara: kara.kid});
	} catch(err) {
		logger.error('Error during song playback', {service: 'Player', obj: err});
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLAY', err));
		// Not sending to sentry when media source couldn't be found
		if (!err.message.includes('No media source')) sentry.error(err, 'Warning');
		stopPlayer(true);
		throw err;
	}
}

export async function playRandomSongAfterPlaylist() {
	try {
		const karas = await getKaras({
			token: {username: 'admin', role: 'admin'},
			random: 1,
			blacklist: true
		});
		const kara = karas.content[0];
		if (kara) {
			await playSingleSong(kara.kid, true);
		} else {
			stopPlayer(true);
			stopAddASongMessage();
		}
	} catch(err) {
		sentry.error(err);
		logger.error('Unable to select random song to play at the end of playlist', {service: 'Player', obj: err});
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_RANDOM_SONG_AFTER_PLAYLIST', err));
	}
}

export async function playCurrentSong(now: boolean) {
	if (!getState().player.playing || now) {
		profile('playCurrentSong');
		try {
			const conf = getConfig();
			const kara = await getCurrentSong();
			// No song to play, silently return
			if (!kara) return;
			setState({currentSong: kara});

			if (kara?.pos === 1) {
				if (conf.Karaoke.AutoBalance) {
					await shufflePlaylist(getState().currentPlaylistID, 'balance');
				}
				// Testing if intro hasn't been played already and if we have at least one intro available
				if (conf.Playlist.Medias.Intros.Enabled && !getState().introPlayed) {
					setState({ currentlyPlayingKara: 'Intros', introPlayed: true });
					await mpv.playMedia('Intros');
					return;
				}
			}
			logger.debug('Karaoke selected', {service: 'Player', obj: kara});
			logger.info(`Playing ${kara.mediafile.substring(0, kara.mediafile.length - 4)}`, {service: 'Player'});

			await mpv.play({
				media: kara.mediafile,
				subfile: kara.subfile,
				gain: kara.gain,
				infos: kara.infos,
				avatar: kara.avatar,
				currentSong: kara,
				duration: kara.duration,
				repo: kara.repo,
				spoiler: kara.misc && kara.misc.some(t => t.name === 'Spoiler')
			});
			setState({currentlyPlayingKara: kara.kid, randomPlaying: false});
			addPlayedKara(kara.kid);
			await setPLCVisible(kara.playlistcontent_id);
			await updatePlaylistDuration(kara.playlist_id);
			await updateUserQuotas(kara);
			emitWS('playlistInfoUpdated', kara.playlist_id);
			if (conf.Karaoke.Poll.Enabled && !conf.Karaoke.StreamerMode.Enabled) startPoll();
		} catch(err) {
			logger.error('Error during song playback', {service: 'Player', obj: err});
			if (!err.message.includes('No media source')) sentry.error(err, 'Warning');
			emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLAY', err));
			if (getState().player.playerStatus !== 'stop') {
				logger.warn('Skipping playback for this song', {service: 'Player'});
				try {
					await next();
				} catch(err) {
					logger.warn('Skipping failed', {service: 'Player'});
				}
			} else {
				logger.warn('Stopping karaoke due to error', {service: 'Player'});
				stopPlayer(true);
			}
		} finally {
			profile('playCurrentSong');
		}
	}
}

/* This is triggered when player ends its current song */
export async function playerEnding() {
	const state = getState();
	const conf = getConfig();
	logger.debug('Player Ending event triggered', {service: 'Player'});
	try {
		if (state.playerNeedsRestart) {
			logger.info('Player restarts, please wait', {service: 'Player'});
			setState({playerNeedsRestart: false});
			await restartPlayer();
		}
		// Stopping after current song, no need for all the code below.
		if (state.stopping) {
			stopPlayer(true);
			setState({stopping: false});
			return;
		}
		// When random karas are being played
		if (state.randomPlaying) {
			await playRandomSongAfterPlaylist();
			return;
		}

		// Handle balance
		if (state.player.mediaType === 'song') {
			let playlist = await getPlaylistContentsMini(state.currentPlaylistID);
			let previousSongIndex = playlist.findIndex(plc => plc.flag_playing);
			let previousSong = playlist[previousSongIndex];
			state.usersBalance.add(previousSong.username);

			let remainingSongs = playlist.length - previousSongIndex - 1;
			if (remainingSongs > 0) {
				let nextSong = playlist[previousSongIndex + 1];
				if (state.usersBalance.has(nextSong.username)) {
					state.usersBalance.clear();
					if (conf.Karaoke.AutoBalance && remainingSongs > 1) {
						await shufflePlaylist(state.currentPlaylistID, 'balance');
					}
				}
				state.usersBalance.add(nextSong.username);
			}
		}
		// If we just played an intro, play a sponsor.
		if (state.player.mediaType === 'Intros') {
			if (conf.Playlist.Medias.Sponsors.Enabled) {
				try {
					await mpv.playMedia('Sponsors');
					setState({currentlyPlayingKara: 'Sponsors'});
				} catch(err) {
					logger.warn('Skipping sponsors due to error, playing current song', {service: 'Player', obj: err});
					emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
					await playCurrentSong(true);
				}
			} else {
				await playCurrentSong(true);
			}
			return;
		}
		const pl = await getPlaylistInfo(state.currentPlaylistID, {username: 'admin', role: 'admin'});
		// If Outro, load the background.
		if (state.player.mediaType === 'Outros' && state.currentSong?.pos === pl.karacount) {
			if (getConfig().Playlist.EndOfPlaylistAction === 'random') {
				await playRandomSongAfterPlaylist();
			} else {
				stopPlayer(true);
			}
			return;
		}
		// If Sponsor, just play currently selected song.
		if (state.player.mediaType === 'Sponsors' && !state.introSponsorPlayed) {
			try {
				// If it's played just after an intro, play next song. If not, proceed as usual
				setState({introPlayed: true, introSponsorPlayed: true});
				await playCurrentSong(true);
			} catch(err) {
				logger.error('Unable to play current song, skipping', {service: 'Player', obj: err});
				try {
					await next();
				} catch(err) {
					logger.error('Failed going to next song', {service: 'Player', obj: err});
				}
			}
			return;
		}
		if (state.player.mediaType === 'Encores') {
			try {
				await next();
			} catch(err) {
				logger.error('Failed going to next song', {service: 'Player', obj: err});
			}
			return;
		}
		// Testing for position before last to play an encore
		logger.debug(`CurrentSong Pos : ${state.currentSong?.pos} - Playlist Kara Count : ${pl.karacount} - Playlist name: ${pl.name} - CurrentPlaylistID: ${state.currentPlaylistID} - Playlist ID: ${pl.playlist_id}`, {service: 'Player'});
		if (conf.Playlist.Medias.Encores.Enabled && state.currentSong?.pos === pl.karacount - 1 && !getState().encorePlayed) {
			try {
				await mpv.playMedia('Encores');
				setState({currentlyPlayingKara: 'Encores', encorePlayed: true});
			} catch(err) {
				logger.error('Unable to play encore file, going to next song', {service: 'Player', obj: err});
				emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
				try {
					await next();
				} catch(err) {
					logger.error('Failed going to next song', {service: 'Player', obj: err});
				}
			}
			return;
		} else {
			setState({encorePlayed: false});
		}
		// Outros code, we're at the end of a playlist.
		// Outros are played after the very last song.
		if (state.currentSong?.pos === pl.karacount && state.player.mediaType !== 'background') {
			if (conf.Playlist.Medias.Outros.Enabled && !state.randomPlaying) {
				try {
					await mpv.playMedia('Outros');
					setState({currentlyPlayingKara: 'Outros'});
				} catch(err) {
					logger.error('Unable to play outro file', {service: 'Player', obj: err});
					emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
					if (conf.Playlist.EndOfPlaylistAction === 'random') {
						await playRandomSongAfterPlaylist();
					} else {
						stopPlayer(true);
					}
				}
			} else if (conf.Playlist.EndOfPlaylistAction === 'random') {
				await playRandomSongAfterPlaylist();
			} else {
				await next();
			}
			return;
		}
		// Jingles and sponsors are played inbetween songs so we need to load the next song
		logger.info(`Songs before next jingle: ${conf.Playlist.Medias.Jingles.Interval - state.counterToJingle} / before next sponsor: ${conf.Playlist.Medias.Sponsors.Interval - state.counterToSponsor}`, {service: 'Player'});
		if (!state.singlePlay && state.counterToJingle >= conf.Playlist.Medias.Jingles.Interval && conf.Playlist.Medias.Jingles.Enabled) {
			try {
				setState({counterToJingle: 0});
				await mpv.playMedia('Jingles');
				setState({currentlyPlayingKara: 'Jingles'});
			} catch(err) {
				logger.error('Unable to play jingle file, going to next song', {service: 'Player', obj: err});
				emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
				try {
					await next();
				} catch(err) {
					logger.error('Failed going to next song', {service: 'Player', obj: err});
				}
			}
			return;
		} else if (state.counterToSponsor >= conf.Playlist.Medias.Sponsors.Interval && conf.Playlist.Medias.Sponsors.Enabled) {
			try {
				setState({counterToSponsor: 0});
				await mpv.playMedia('Sponsors');
				setState({currentlyPlayingKara: 'Sponsors'});
			} catch(err) {
				logger.error('Unable to play sponsor file, going to next song', {service: 'Player', obj: err});
				emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
				try {
					await next();
				} catch(err) {
					logger.error('Failed going to next song', {service: 'Player', obj: err});
				}
			}
			return;
		} else {
			if (!state.singlePlay) {
				state.counterToJingle++;
				state.counterToSponsor++;
				setState({counterToSponsor: state.counterToSponsor, counterToJingle: state.counterToJingle});
			} else {
				setState({singlePlay: false});
			}
			if (state.player.playerStatus !== 'stop') {
				try {
					await next();
					return;
				} catch(err) {
					logger.error('Failed going to next song', {service: 'Player', obj: err});
				}
			} else {
				stopPlayer(true);
			}
		}

	} catch(err) {
		logger.error('Unable to end play properly, stopping.', {service: 'Player', obj: err});
		sentry.error(err);
		stopPlayer(true);
	}
}