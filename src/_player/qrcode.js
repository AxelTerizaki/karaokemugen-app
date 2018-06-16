import {toFile} from 'qrcode';
import {getConfig} from '../_common/utils/config.js';
import {resolve} from 'path';
import {logger} from '../_common/utils/logger';

export async function buildQRCode(url) {
	const conf = getConfig();
	const qrcodeImageFile = resolve(conf.appPath,conf.PathTemp,'qrcode.png');
	logger.debug('[QRCode] URL detected : '+url);
	toFile(qrcodeImageFile, url, {}, (err) => {
		if (err) {
			logger.error('[QRCode] Error generating QR Code : '+err);
			throw err;
		} else {
			return true;
		}
	});
}



