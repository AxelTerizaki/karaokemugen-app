import {extractMediaFiles} from '../lib/utils/files';
import {resolve} from 'path';
import {getConfig, resolvedPathIntros, resolvedPathOutros, resolvedPathEncores, resolvedPathJingles, resolvedPathSponsors} from '../lib/utils/config';
import logger from 'winston';
import sample from 'lodash.sample';
import { Media, MediaType } from '../types/medias';
import { editSetting } from '../utils/config';
import {gitUpdate} from '../utils/git';
import cloneDeep from 'lodash.clonedeep';

const medias = {
	Intros: [] as Media[],
	Outros: [] as Media[],
	Encores: [] as Media[],
	Jingles: [] as Media[],
	Sponsors: [] as Media[],
};

const currentMedias = {};

export async function updatePlaylistMedias() {
	const updates = getConfig().Online.Updates.Medias;
	for (const type of Object.keys(updates)){
		try {
			if (updates[type]) await updateMediasGit(type as MediaType);
			buildMediasList(type as MediaType);
		} catch(err) {
			//Non fatal
		}
	}
}

function resolveMediaPath(type: MediaType): string[] {
	if (type === 'Intros') return resolvedPathIntros();
	if (type === 'Outros') return resolvedPathOutros();
	if (type === 'Encores') return resolvedPathEncores();
	if (type === 'Jingles') return resolvedPathJingles();
	if (type === 'Sponsors') return resolvedPathSponsors();
}

export async function updateMediasGit(type: MediaType) {

	try {
		const localDirs = await gitUpdate(resolve(resolveMediaPath(type)[0], 'KaraokeMugen/'), `https://lab.shelter.moe/karaokemugen/medias/${type}.git`, type, getConfig().System.Path[type]);
		if (localDirs) {
			const config = {System: {Path: {}}};
			config.System.Path[type] = localDirs;
			editSetting(config);
		}
	} catch(err) {
		logger.warn(`[${type}] Error updating : ${err}`);
		throw err;
	}
}

export async function buildMediasList(type: MediaType) {
	medias[type] = [];
	for (const resolvedPath of resolveMediaPath(type)) {
		const newMedias = await extractMediaFiles(resolvedPath);
		for (const media of newMedias) {
			medias[type].push({
				file: media.filename,
				gain: media.gain,
				series: media.filename.split(' - ')[0]
			});
		}
	}
	currentMedias[type] = cloneDeep(medias[type]);
	logger.debug(`[${type}] Computed : ${JSON.stringify(medias[type])}`);
}

export function getSingleMedia(type: MediaType): Media {
	// If no medias exist, return null.
	if (!medias[type] || (medias[type] && medias[type].length === 0)) {
		return null;
	} else {
		// If our current files list is empty after the previous removal
		// Fill it again with the original list.
		currentMedias[type] = cloneDeep(medias[type]);
	}
	// If a default file is provided, search for it. If undefined or not found, pick one from a random series
	const series = sample(currentMedias[type].map((m: Media) => m.series));
	let media = null;
	//Jingles do not have a specific file to use in options
	if (type === 'Jingles' || type === 'Sponsors') {
		media = sample(currentMedias[type].filter((m: Media) => m.series === series));
	} else {
		media = currentMedias[type].find((m: Media) => m.file === getConfig().Playlist.Medias[type].File)
		||
		sample(currentMedias[type].filter((m: Media) => m.series === series));
	}
	//Let's remove the serie of the jingle we just selected so it won't be picked again next time.
	currentMedias[type] = currentMedias[type].filter((m: Media) => m.series !== media.series);
	logger.info(`[Player] ${type} time !`);
	return media;
}
