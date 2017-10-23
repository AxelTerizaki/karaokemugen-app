import {exists, readFile, readdir, rename, unlink} from 'fs';
import {remove, mkdirp, copy} from 'fs-extra';
import {promisify} from 'util';
import {resolve} from 'path';
import logger from 'winston';

/** Fonction de vérification d'existence d'un fichier renvoyant une Promise.*/
export function asyncExists(file) {
	return promisify(exists)(file);
}

/** Fonction de lecture d'un fichier renvoyant une Promise.*/
export function asyncReadFile(...args) {
	return promisify(readFile)(...args);
}

export function asyncReadDir(...args) {
	return promisify(readdir)(...args);
}

export function asyncMkdirp(...args) {
	return promisify(mkdirp)(...args);
}

export function asyncRemove(...args) {
	return promisify(remove)(...args);
}

export function asyncRename(...args) {
	return promisify(rename)(...args);
}

export function asyncUnlink(...args) {
	return promisify(unlink)(...args);
}

export function asyncCopy(...args) {
	return promisify(copy)(...args);
}

/** Fonction vérifiant la présence d'un fichier requis, levant une exception s'il n'est pas trouvé. */
export async function asyncRequired(file) {
	const exists = await asyncExists(file);
	if (!exists) {
		throw 'File \'' + file + '\' does not exist';
	}
}

export async function asyncCheckOrMkdir(...dir) {
	const resolvedDir = resolve(...dir);
	if (!await asyncExists(resolvedDir)) {
		logger.warn('Creating folder ' + resolvedDir);
		return await asyncMkdirp(resolvedDir);
	}
}

/**
 * Recherche d'un fichier dans une liste de répertoirs. Si le fichier est trouvé,
 * on renvoie son chemin complet (avec 'resolve').
 * Important: on suppose que les chemins des répertoires en paramètre sont eux-même déjà résolus.
 */
export async function resolveFileInDirs(filename, dirs) {
	for (const dir of dirs) {
		const resolved = resolve(dir, filename);
		if (await asyncExists(resolved)) {
			return resolved;
		}
	}
	throw 'File \'' + filename + '\' not found in any listed directory: ' + dirs;
}
