import { expect } from 'chai';
import sample from 'lodash.sample';

import { DBPL } from '../src/lib/types/database/playlist';
import { PlaylistExport } from '../src/lib/types/playlist';
import { uuidRegexp } from '../src/lib/utils/constants';
import { DBPLC } from '../src/types/database/playlist';
import { allKIDs, commandBackend, getToken, setPlaid, testKara } from './util/util';

describe('Playlists', () => {
	let playlistExport: PlaylistExport;
	let newPlaylistID: string;
	let currentPlaylistID: string;
	let publicPlaylistID: string;
	let newCurrentPlaylistID: string;
	let newPublicPlaylistID: string;
	let PLCID: number;
	const KIDToAdd = sample(allKIDs);
	const KIDToAdd2 = sample(allKIDs.filter((kid: string) => kid !== KIDToAdd));
	let token: string;
	before(async () => {
		token = await getToken();
	});

	it('Create a playlist', async () => {
		const playlist = {
			name: 'new_playlist',
			flag_visible: true,
			flag_public: false,
			flag_current: false,
		};
		const data = await commandBackend(token, 'createPlaylist', playlist);
		newPlaylistID = data.plaid;
		setPlaid(data.plaid);
	});

	it('Test findPlaying without any playing song set', async () => {
		const data = await commandBackend(token, 'findPlayingSongInPlaylist', { plaid: newPlaylistID });
		expect(data.index).to.be.equal(-1);
	});

	it(`Add all songs to playlist ${newPlaylistID}`, async () => {
		await commandBackend(token, 'addKaraToPlaylist', {
			kids: allKIDs,
			requestedby: 'Test',
			plaid: newPlaylistID
		});
	});

	it(`Add karaoke ${KIDToAdd} again to playlist ${newPlaylistID} to see if it fails`, async () => {
		try {
			await commandBackend(token, 'addKaraToPlaylist', {
				kids: [KIDToAdd],
				requestedby: 'Test',
				plaid: newPlaylistID
			});
		} catch (err) {
			expect(err.message.code).to.be.equal('PL_ADD_SONG_ERROR');
		}
	});

	it(`Add an unknown karaoke to playlist ${newPlaylistID} to see if it fails`, async () => {
		try {
			await commandBackend(token, 'addKaraToPlaylist', {
				kids: ['c28c8739-da02-49b4-889e-b15d1e9b2132'],
				requestedby: 'Test',
				plaid: newPlaylistID
			}, true);
		} catch (err) {
			expect(err.message.code).to.be.equal('PL_ADD_SONG_ERROR');
		}
	});

	it(`Add karaoke ${KIDToAdd} to an unknown playlist to see if it fails`, async () => {
		try {

			await commandBackend(token, 'addKaraToPlaylist', {
				kids: [KIDToAdd],
				requestedby: 'Test',
				plaid: '0f82b7df-efa0-4018-adfd-7bd104f9bd51'
			}, true);
		} catch (err) {
			expect(err.message.code).to.be.equal('PL_ADD_SONG_ERROR');
		}

	});

	it('Get list of karaokes in a playlist', async () => {
		const data = await commandBackend(token, 'getPlaylistContents', { plaid: newPlaylistID });
		expect(data.content.length).to.be.at.least(1);
		for (const plc of data.content) {
			testKara(plc, { tagDetails: 'short', plc: true });
		}
		PLCID = data.content[0].plcid;
	});

	it('Get specific karaoke in a playlist', async () => {
		const data = await commandBackend(token, 'getPLC', {
			plaid: newPlaylistID,
			plc_id: 1
		});
		testKara(data, { tagDetails: 'full', plcDetail: true, plc: true });
	});

	it('Create a CURRENT playlist', async () => {
		const playlist_current = {
			name: 'new_current_playlist',
			flag_visible: true,
			flag_public: false,
			flag_current: true
		};
		const data = await commandBackend(token, 'createPlaylist', playlist_current);
		newCurrentPlaylistID = data.plaid;
	});

	it('Create a PUBLIC playlist', async () => {
		const playlist_public = {
			name: 'new_public_playlist',
			flag_visible: true,
			flag_public: true,
			flag_current: false
		};
		const data = await commandBackend(token, 'createPlaylist', playlist_public);
		publicPlaylistID = data.plaid;
		newPublicPlaylistID = data.plaid;
	});

	it('Delete a CURRENT playlist (should fail)', async () => {
		const data = await commandBackend(token, 'deletePlaylist', { plaid: newCurrentPlaylistID }, true);
		expect(data.message.code).to.be.equal('PL_DELETE_ERROR');
	});

	it('Delete a PUBLIC playlist (should fail)', async () => {
		const data = await commandBackend(token, 'deletePlaylist', { plaid: newPublicPlaylistID }, true);
		expect(data.message.code).to.be.equal('PL_DELETE_ERROR');
	});

	it('Set playlist to current', async () => {
		const data = {
			plaid: newPlaylistID,
			flag_current: true
		};
		try {
			await commandBackend(token, 'editPlaylist', data);
		} catch(err) {
			console.log(err);
			throw err;
		}
	});

	it('Set playlist to public', async () => {
		try {
			const data = {
				plaid: newPublicPlaylistID,
				flag_public: true
			};
			await commandBackend(token, 'editPlaylist', data);
		} catch(err) {
			console.log(err);
			throw err;
		}
	});

	it('Get list of playlists AFTER setting new current/public PLs', async () => {
		const data = await commandBackend(token, 'getPlaylists');
		expect(data.length).to.be.at.least(2);
		const playlist = data.find((pl: DBPL) => pl.flag_current === true);
		const playlists: DBPL[] = data;
		currentPlaylistID = playlist.plaid;
		for (const pl of playlists) {
			if (pl.plaid === newPlaylistID) expect(pl.flag_current).to.be.true;
			if (pl.plaid === newPublicPlaylistID) expect(pl.flag_public).to.be.true;
		}
	});

	it('Copy karaokes to another playlist', async () => {
		await commandBackend(token, 'copyKaraToPlaylist', {
			plc_ids: [PLCID],
			plaid: newCurrentPlaylistID
		});
	});

	it('Create a CURRENT+PUBLIC playlist', async () => {
		const playlist_current = {
			name: 'new_current_public_playlist',
			flag_visible: true,
			flag_public: true,
			flag_current: true
		};
		const data = await commandBackend(token, 'createPlaylist', playlist_current);
		newCurrentPlaylistID = data.plaid;
		newPublicPlaylistID = data.plaid;
	});

	it('Add karaoke to public playlist', async () => {
		const data = await commandBackend(token, 'addKaraToPublicPlaylist', { kids: [KIDToAdd2] });
		expect(data.code).to.be.equal('PL_SONG_ADDED');
		expect(data.data.plc.kid).to.be.equal(KIDToAdd2);
		PLCID = data.data.plc.plcid;
	});

	it('Shuffle playlist', async () => {
		// First get playlist as is
		let data = await commandBackend(token, 'getPlaylistContents', { plaid: newPlaylistID });
		const playlist: DBPLC[] = data.content;
		await commandBackend(token, 'shufflePlaylist', { plaid: newPlaylistID, method: 'normal' });
		// Re-getting playlist to see if order changed
		data = await commandBackend(token, 'getPlaylistContents', { plaid: newPlaylistID });
		const shuffledPlaylist = data.content;
		expect(JSON.stringify(shuffledPlaylist)).to.not.be.equal(JSON.stringify(playlist));
	});

	it('Export a playlist', async () => {
		const data = await commandBackend(token, 'exportPlaylist', { plaid: newPlaylistID });
		expect(data.Header.description).to.be.equal('Karaoke Mugen Playlist File');
		expect(data.PlaylistContents.length).to.be.at.least(1);
		for (const plc of data.PlaylistContents) {
			expect(plc.created_at).to.be.a('string');
			expect(plc.kid).to.be.a('string').and.match(new RegExp(uuidRegexp));
			expect(plc.username).to.be.a('string');
			expect(plc.nickname).to.be.a('string');
			expect(plc.pos).to.be.a('number');
			if (plc.flag_playing) expect(plc.flag_playing).to.be.a('boolean');
		}
		expect(data.PlaylistInformation.created_at).to.be.a('string');
		expect(data.PlaylistInformation.flag_visible).to.be.a('boolean');
		expect(data.PlaylistInformation.modified_at).to.be.a('string');
		expect(data.PlaylistInformation.name).to.be.a('string');
		playlistExport = data;
	});

	it('Import a playlist', async () => {
		const data = {
			playlist: playlistExport
		};
		const body = await commandBackend(token, 'importPlaylist', data);
		expect(body.message.code).to.be.equal('PL_IMPORTED');
		expect(body.message.data.unknownRepos).to.have.lengthOf(0);
	});

	it('Import a playlist (failure)', async () => {
		const data = {
			playlist: playlistExport.PlaylistContents
		};
		const body = await commandBackend(token, 'importPlaylist', data, true);
		expect(body.message.code).to.be.equal('PL_IMPORT_ERROR');
	});

	it('Update a playlist\'s information', async () => {
		const data = {
			name: 'new_playlist',
			flag_visible: true,
			plaid: newPlaylistID
		};
		await commandBackend(token, 'editPlaylist', data);
	});

	it('Get list of playlists', async () => {
		const data = await commandBackend(token, 'getPlaylists');
		expect(data.length).to.be.at.least(2);
		const playlist = data.find((pl: DBPL) => pl.flag_current === true);
		const playlists: DBPL[] = data;
		currentPlaylistID = playlist.plaid;
		for (const pl of playlists) {
			expect(pl.created_at).to.be.a('string');
			expect(pl.modified_at).to.be.a('string');
			expect(pl.duration).to.be.a('number').and.at.least(0);
			expect(pl.flag_current).to.be.a('boolean');
			expect(pl.flag_visible).to.be.a('boolean');
			expect(pl.flag_public).to.be.a('boolean');
			expect(pl.karacount).to.be.a('number').and.at.least(0);
			expect(pl.name).to.be.a('string');
			expect(pl.plaid).to.be.a('string').and.match(new RegExp(uuidRegexp));
			expect(pl.plcontent_id_playing).to.be.a('number').and.at.least(0);
			expect(pl.time_left).to.be.a('number').and.at.least(0);
			expect(pl.username).to.be.a('string');
		}
	});

	it('Get current playlist information', async () => {
		const data = await commandBackend(token, 'getPlaylist', { plaid: currentPlaylistID });
		expect(data.flag_current).to.be.true;
	});

	let currentPLCID: number;

	it('List contents from public playlist', async () => {
		const data = await commandBackend(token, 'getPlaylistContents', { plaid: newPublicPlaylistID });
		// We get the PLC_ID of our last karaoke, the one we just added
		currentPLCID = data.content[data.content.length - 1].plcid;
		expect(data.content.length).to.be.at.least(1);
	});

	it('Edit karaoke from playlist : flag_playing', async () => {
		const data = {
			flag_playing: true,
			plc_ids: [currentPLCID]
		};
		await commandBackend(token, 'editPLC', data);
	});

	it('Test findPlaying after a playing flag is set', async () => {
		const data = await commandBackend(token, 'findPlayingSongInPlaylist', { plaid: newPublicPlaylistID });
		expect(data.index).to.be.at.least(0);
	});

	it('Edit karaoke from playlist : position', async () => {
		await commandBackend(token, 'editPLC', {
			plc_ids: [currentPLCID],
			pos: 1
		});
	});

	it('List contents from public playlist AFTER position change', async () => {
		const data = await commandBackend(token, 'getPlaylistContents', { plaid: newPublicPlaylistID });
		// Our PLCID should be in first position now
		expect(data.content[0].plcid).to.be.equal(currentPLCID);
		expect(data.content[0].flag_playing).to.be.true;
	});

	it('Get playlist information AFTER new flag_playing', async () => {
		const data = await commandBackend(token, 'getPlaylist', { plaid: newPublicPlaylistID });
		expect(data.plcontent_id_playing).to.be.equal(currentPLCID);
	});

	it('Up/downvote a song in public playlist Error 403', async () => {
		const data = await commandBackend(token, 'votePLC', { plc_id: currentPLCID }, true);
		expect(data.message.code).to.be.equal('UPVOTE_NO_SELF');
	});

	it('Upvote a song in public playlist', async () => {
		const token = await getToken('adminTest2');
		await commandBackend(token, 'votePLC', { plc_id: currentPLCID });
	});

	it('List contents from public playlist AFTER upvote', async () => {
		const token = await getToken('adminTest2');
		const data = await commandBackend(token, 'getPlaylistContents', { plaid: newPublicPlaylistID });
		// Our PLCID should be in first position now
		const plc: DBPLC = data.content.find(plc => plc.plcid === currentPLCID);
		expect(plc.upvotes).to.be.at.least(1);
		expect(plc.flag_upvoted).to.be.true;
	});

	it('Downvote a song in public playlist', async () => {
		const token = await getToken('adminTest2');
		await commandBackend(token, 'votePLC', { plc_id: currentPLCID, downvote: true });
	});

	it('List contents from public playlist AFTER downvote', async () => {
		const token = await getToken('adminTest2');
		const data = await commandBackend(token, 'getPlaylistContents', { plaid: newPublicPlaylistID });
		// Our PLCID should be in first position now
		const plc: DBPLC = data.content.find(plc => plc.plcid === currentPLCID);
		expect(plc.upvotes).to.be.at.below(1);
		expect(plc.flag_upvoted).to.be.false;
	});

	it('Delete karaokes from playlist', async () => {
		const data = {
			plc_ids: [PLCID]
		};
		await commandBackend(token, 'deleteKaraFromPlaylist', data);
	});

	it('Empty playlist', async () => {
		await commandBackend(token, 'emptyPlaylist', { plaid: newPublicPlaylistID });
	});

	it('List contents from public playlist AFTER empty', async () => {
		const data = await commandBackend(token, 'getPlaylistContents', { plaid: newPublicPlaylistID });
		expect(data.content).to.have.lengthOf(0);
	});

	it('Delete a playlist', async () => {
		await commandBackend(token, 'deletePlaylist', { plaid: publicPlaylistID });
	});

	it('Get list of playlists AFTER deleting playlist', async () => {
		const data = await commandBackend(token, 'getPlaylists');
		const plIDs = data.map(pl => pl.plaid);
		expect(plIDs).to.not.include(publicPlaylistID);
	});
});
