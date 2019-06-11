import logger from '../lib/utils/logger';
import {resolve} from 'path';
import {
	asyncUnlink, resolveFileInDirs, asyncExists, asyncReadDir
} from '../lib/utils/files';
import {
	resolvedPathPreviews, resolvedPathMedias
} from '../lib/utils/config';
import {createPreview} from '../lib/utils/ffmpeg';
import {getKaras} from '../services/kara';

async function extractPreviewFiles(previewDir: string): Promise<string[]> {
	const dirListing = await asyncReadDir(previewDir);
	return dirListing.filter((file: string) => {
		return (!file.startsWith('.') && (!file.startsWith('output')) && file.endsWith('.mp4'));
	});
}

export async function isPreviewAvailable(kid: string, mediasize: number): Promise<string> {
	const previewDir = resolvedPathPreviews();
	if (await asyncExists(resolve(previewDir, `${kid}.${mediasize}.mp4`))) {
		return `${kid}.${mediasize}.mp4`;
	} else {
		return null;
	}
}

export async function createPreviews() {
	logger.debug('[Previews] Starting preview generation');
	const karas = await getKaras({token: {username: 'admin', role: 'admin'}});
	const previewDir = resolvedPathPreviews();
	const previewFiles = await extractPreviewFiles(previewDir);
	// Remove unused previewFiles
	for (const file of previewFiles) {
		const fileParts = file.split('.');
		let mediasize: number;
		const found = karas.content.some(k => {
			// If it returns true, we found a karaoke. We'll check mediasize of that kara to determine if we need to remove the preview and recreate it.
			// Since .some stops after a match, mediasize will be equal to the latest kara parsed's mediafile
			mediasize = k.mediasize;
			return k.kid === fileParts[0];
		});
		if (found) {
			// Compare mediasizes. If mediasize is different, remove file
			if (mediasize !== +fileParts[1]) asyncUnlink(resolve(previewDir, file));
		} else {
			// No kara with that KID found in database, the preview files must be removed
			asyncUnlink(resolve(previewDir, file));
		}
	}
	// Now create non-existing previews
	for (const index in karas.content) {
		const kara = karas.content[index];
		const counter = +index + 1;
		if (!await asyncExists(resolve(previewDir, `${kara.kid}.${kara.mediasize}.mp4`)) && !kara.mediafile.endsWith('.mp3')) {
			logger.info(`[Previews] Creating preview for ${kara.mediafile} (${counter}/${karas.content.length})`);
			const mediaFile = await resolveFileInDirs(kara.mediafile, resolvedPathMedias());
			try {
				await createPreview({
					videofile: mediaFile,
					previewfile: resolve(previewDir, `${kara.kid}.${kara.mediasize}.mp4`)
				});
			} catch(err) {
				logger.warn(`[Previews] Failed to create preview for ${kara.mediafile} : ${err}`);
			}
		}
	}
	logger.info('[Previews] Finished generating preview');
}