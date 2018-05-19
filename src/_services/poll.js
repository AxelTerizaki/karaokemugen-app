
import {on} from '../_common/utils/pubsub';
import {getConfig} from '../_common/utils/config';
import {copyKaraToPlaylist, translateKaraInfo, isAllKarasInPlaylist, isACurrentPlaylist, isAPublicPlaylist, getPlaylistContents} from '../_services/playlist';
import {sample, sampleSize} from 'lodash';
import {emitWS} from '../_webapp/frontend';
import {promisify} from 'util';
import uuidV4 from 'uuid/v4';
const sleep = promisify(setTimeout);

let state = {};
let poll = [];
let voters = [];
let pollUUID;
let pollEnding = false;
let playerEnding = false;
let playerPlaying = false;

on('engineStatusChange', (newstate) => {
	state.engine = newstate[0];
	if (!state.engine.songPoll && poll.length > 0) stopPoll();
});

on('playerStatusChange', (player) => {
	if (player.songType == 'song') {
		if (!playerPlaying) {
			playerPlaying = true;
			startPoll();
		}
		if (player.position >= player.duration - 10) {
			if (!playerEnding) {
				playerEnding = true;
				endPoll();
			}
		} else {
			playerEnding = false;
		}		
	} else {
		playerPlaying = false;
	}
});

export async function timerPoll() {
	const internalUUID = pollUUID = uuidV4();
	await sleep(getConfig().EngineSongPollTimeout * 1000);
	if (internalUUID === pollUUID) endPoll();
}

export function endPoll() {
	pollEnding = true;
	console.log('Ending poll');
	getPollResults().then(winner => {
		emitWS('songPollResult',winner);
		stopPoll();
	});
}

export function stopPoll() {
	poll = [];
	voters = [];
	pollEnding = false;
	emitWS('songPollEnded');
}

export async function getPollResults(lang) {
	const maxVotes = Math.max.apply(Math,poll.map((choice) => {
		return choice.votes;
	}));
	// We check if winner isn't the only one...
	let winners = [];
	for (const choice of poll) {
		if (+choice.votes === +maxVotes) winners.push(choice);
	}
	let winner = sample(winners);
	winner = translateKaraInfo(winner,lang);
	const playlist_id = await isACurrentPlaylist();
	await copyKaraToPlaylist([winner[0].playlistcontent_id],playlist_id);
	emitWS('playlistInfoUpdated',playlist_id);
	emitWS('playlistContentsUpdated',playlist_id);
	return {
		votes: maxVotes,
		kara: `${winner[0].serie} - ${winner[0].songtype_i18n_short}${winner[0].songorder} - ${winner[0].title}`
	};
}

export async function addPollVote(playlistcontent_id,token) { 
	pollEnding = false;
	if (poll.length === 0 || pollEnding) throw {
		code: 'POLL_NOT_ACTIVE'
	};		
	if (hasUserVoted(token.username)) throw {
		code: 'POLL_USER_ALREADY_VOTED'
	};
	const choiceFound = poll.some((choice, index) => {
		if (+choice.playlistcontent_id === +playlistcontent_id) {
			poll[index].votes++;
			return true;
		}
		return false;
	});
	if (!choiceFound) throw {
		code: 'POLL_VOTE_ERROR',
		message: 'This song is not in the poll'
	};
	voters.push(token.username);	
	return {
		code: 'POLL_VOTED',
		data: poll
	};
}

export async function startPoll() {
	const conf = getConfig();
	logger.info('[Poll] Starting a new poll');
	poll = [];	
	voters = [];
	pollEnding = false;
	// Create new poll
	const [publicPlaylist_id, currentPlaylist_id] = await Promise.all([		
		isAPublicPlaylist(),
		isACurrentPlaylist(),
	]);	
	// Get a list of karaokes to add to the poll
	const [pubpl, curpl] = await Promise.all([
		getPlaylistContents(publicPlaylist_id),
		getPlaylistContents(currentPlaylist_id)
	]);
	const availableKaras = isAllKarasInPlaylist(pubpl, curpl);
	let pollChoices = conf.EngineSongPollChoices;
	if (availableKaras.length < pollChoices) pollChoices = availableKaras.length;
	poll = sampleSize(availableKaras,pollChoices);
	for (const index in poll) {
		poll[index].votes = 0;
	}
	emitWS('newSongPoll',poll);
	timerPoll();
}

function hasUserVoted(username) {
	return voters.includes(username);	
}

export async function getPoll(token, lang, from, size) {	
	if (poll.length === 0) throw {
		code: 'POLL_NOT_ACTIVE'
	};	
	poll = translateKaraInfo(poll,lang);
	return {
		infos: { 
			count: poll.length,
			from: parseInt(from,10),
			to: parseInt(from,10)+parseInt(size,10)
		},
		poll: poll,
		flag_uservoted: hasUserVoted(token.username)
	};	
}