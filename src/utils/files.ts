import { isAbsolute, normalize } from 'path';

import { KMFileType } from '../types/files';

export function detectKMFileTypes(data: any): KMFileType {
	return data?.header?.description || data?.Header?.description;
}

export function pathIsContainedInAnother(p1, p2) {
	if (!isAbsolute(p1) || !isAbsolute(p2)) throw new Error('One of the path is not absolute.');
	let origin = normalize(p1);
	origin = origin.endsWith('/') ? origin:`${origin}/`;
	let dst = normalize(p2);
	dst = dst.endsWith('/') ? dst:`${dst}/`;
	return dst.startsWith(origin);
}
