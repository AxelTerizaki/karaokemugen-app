import {expect} from 'chai';

import {DBKara} from '../src/lib/types/database/kara';
import { allKIDs,commandBackend,getToken, testKara } from './util/util';

const jpnTag = '4dcf9614-7914-42aa-99f4-dbce2e059133~5';

describe('Karas information', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});

	it('Get a random karaoke ID', async () => {
		const data = await commandBackend(token, 'getKaras', {random: 1});
		expect(data.content).to.have.lengthOf(1);
		//Uncomment when we'll have our own test repo
		//expect(data.content[0].kid).to.be.oneOf(allKIDs);
	});

	it('Get all japanese songs', async () => {
		const data = await commandBackend(token, 'getKaras', {q: `t:${jpnTag}`});
		for (const kara of data.content) {
			expect(kara.tid).to.include(jpnTag);
		}
	});

	it('Get songs from 2004', async () => {
		const data = await commandBackend(token, 'getKaras', {q: 'y:2004'});
		for (const kara of data.content) {
			expect(kara.year).to.be.equal(2004);
		}
	});

	it('Get songs from 2004 AND japanese', async () => {
		const data = await commandBackend(token, 'getKaras', {q: `y:2004!t:${jpnTag}`});
		for (const kara of data.content) {
			expect(kara.year).to.be.equal(2004);
			expect(kara.tid).to.include(jpnTag);
		}
	});

	it('Get songs in most recent order', async () => {
		const data = await commandBackend(token, 'getKaras', {order: 'recent'});
		const dateList = data.content.map((k: DBKara) => k.created_at);
		const dateList2 = [].concat(dateList);
		dateList2.sort();
		expect(JSON.stringify(dateList)).to.be.equal(JSON.stringify(dateList2.reverse()));
	});

	it('Get complete list of karaokes with Dragon Ball in their name', async () => {
		const data = await commandBackend(token, 'getKaras', {filter: 'Dragon Ball'});
		// This is made so if we ever run tests on a full database, it'll work.
		for (const kara of data.content) {
			expect(kara.series[0].name).to.include('Dragon').and.include('Ball');
			testKara(kara, {tagDetails: 'short', kara: true});
		}
	});

	it('Get song info from database', async () => {
		const data = await commandBackend(token, 'getKara', {kid: allKIDs[0]});
		expect(data.kid).to.be.equal(allKIDs[0]);
		testKara(data, {tagDetails: 'full', kara: true});
	});

	it('Get song lyrics', async () => {
		const data = await commandBackend(token, 'getKaraLyrics', {kid: allKIDs[0]});
		expect(data.length).to.be.at.least(1);
	});

	it('Get year list', async () => {
		const data = await commandBackend(token, 'getYears');
		expect(data.content.length).to.be.at.least(1);
		for (const year of data.content) {
			expect(year.year).to.be.not.NaN;
			expect(year.karacount).to.be.not.NaN;
		}
	});
});

