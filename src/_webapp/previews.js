import logger from 'winston';
import {resolve, extname, basename} from 'path';

import {
	asyncExists, asyncReadDir, asyncRemove, asyncStat, resolveFileInDirs
} from '../_common/utils/files';
import {
	getConfig, resolvedPathVideos, resolvedPathPreviews
} from '../_common/utils/config';
import {createPreview} from '../_common/utils/ffmpeg';

async function extractVideoFiles(videoDir) {	
	const dirListing = await asyncReadDir(videoDir);
	return dirListing.filter(file => !file.startsWith('.') && (
		file.endsWith('.mp4') || 
			file.endsWith('.webm') ||
			file.endsWith('.avi') ||
			file.endsWith('.mkv'))
	).map(file => resolve(videoDir, file));
}

async function extractPreviewFiles(previewDir) {
	const previewFiles = [];
	const dirListing = await asyncReadDir(previewDir);
	for (const file of dirListing) {
		if (!file.startsWith('.') && file.endsWith('.mp4')) {
			previewFiles.push(resolve(previewDir, file));
		}
	}
	return previewFiles;
}


async function compareVideosPreviews(videofiles,previewfiles) {
	const previewFilesToCreate = [];
	for (const videofile of videofiles) {
		let addPreview = true;
		const videoStats = await asyncStat(videofile);		
		const previewfileWOExt = basename(videofile, extname(videofile));
		const previewfilename = resolvedPathPreviews()+`/${previewfileWOExt}.${videoStats.size}.mp4`;	
		if (previewfiles.length != 0) {
			for (const previewfile of previewfiles) {
				const previewparts = previewfile.match(/^(.+)\.([0-9]+)\.([^.]+)$/);				
				const size = previewparts[2];
				if (basename(previewparts[1]) === (basename(videofile).replace(/\.[^.]+$/, ''))) {
					if (size != videoStats.size)  {
					//If it's different, remove previewfile and create a new one
						await asyncRemove(previewfile);						
					} else {
						addPreview = false;
					}
				} 
			}
		}
		if (addPreview) {
			previewFilesToCreate.push({
				videofile: videofile,
				previewfile: previewfilename
			});
		}		
	}	
	return previewFilesToCreate;
}
export async function createPreviews(config) {
	try {
		const conf = config || getConfig();		
		logger.info('[Previews] Starting preview generation');
		//TODO : Lire les dossiers vidéo depuis le dossier de configuration
		const videoFiles = await extractVideoFiles(resolve(conf.appPath,conf.PathVideos));
		const previewFiles = await extractPreviewFiles(resolvedPathPreviews());
		const videoFilesToPreview = await compareVideosPreviews(videoFiles,previewFiles);
		//cleanUpPreviewsFolder(videoFiles,previewfiles);
		for (const videoPreview of videoFilesToPreview) {
			await createPreview(videoPreview);
			logger.info(`[Previews] Generated ${videoPreview.videofile}`);
		}
		logger.info('[Previews] Finished generating all previews.');
	} catch (err) {
		logger.error(err);
	}
}