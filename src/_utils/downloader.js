import _cliProgress from 'cli-progress';
import logger from 'winston';
import {basename} from 'path';
import got from 'got';
import prettyBytes from 'pretty-bytes';
import {createWriteStream} from 'fs';
import { getState } from './state';
import { emitWS } from '../_webapp/frontend';

const HttpAgent = require('agentkeepalive');
const {HttpsAgent} = HttpAgent;

export default class Downloader {

	constructor(list, opts) {
	  this.list = list;
	  this.pos = 0;
	  this.opts = opts;
	  this.onEnd = null;
	  this.fileErrors = [];
	  if (opts.bar)	this.bar = new _cliProgress.Bar({
			format:  'Downloading {bar} {percentage}% {value}/{total} Mb',
			stopOnComplete: true
	  }, _cliProgress.Presets.shades_classic);
	}

	// Triggers the download chain
	download = onEnd => {
	  if (onEnd) this.onEnd = onEnd;
	  if (this.pos >= this.list.length) {
			this.onEnd(this.fileErrors);
	  } else {
			const nextUrl = this.list[this.pos].url;
			const nextFilename = this.list[this.pos].filename;
			const id = this.list[this.pos].id;
			const tryURL = new Promise((resolve, reject) => {
				// Try to run a HEAD to get the size
				let options = {
					method: 'HEAD',
					agent: {
						http: new HttpAgent(),
						https: new HttpsAgent()
					},
					headers: {
						'user-agent': `KaraokeMugen/${getState().version.number}`
					}
				};
				if (this.opts.auth) options.auth = {
					username: this.opts.auth.user,
					password: this.opts.auth.pass
				};
				got(nextUrl, options)
					.then(response => {
						resolve(response.headers['content-length']);
					})
					.catch(err => {
						reject(err);
					});
			});
			let prettySize = 'size unknown';
			tryURL.then(size => {
				if (!isNaN(size)) prettySize = prettyBytes(+size);
				logger.info(`[Download] (${this.pos+1}/${this.list.length}) Downloading ${basename(nextFilename)} (${prettySize})`);
				emitWS('downloadBatchProgress', {
					text: `Downloading file ${this.pos} of ${this.list.length}`,
					value: this.pos,
					total: this.list.length,
					id: id
				});
				this.pos = this.pos + 1;
				this.DoDownload(nextUrl, nextFilename, size, id, this.download, err => {
					logger.error(`[Download] Error during download of ${basename(nextFilename)} : ${err}`);
					this.fileErrors.push(basename(nextFilename));
					this.download();
				});
			})
				.catch((err) => {
					logger.error(`[Download] (${this.pos+1}/${this.list.length}) Unable to start download of ${basename(nextFilename)} (${prettySize}) : ${err}`);
					this.pos = this.pos + 1;
					this.fileErrors.push(basename(nextFilename));
					this.download();
				});
	  }
	}

	DoDownload = (url, filename, size, id, onSuccess, onError) => {

		if (this.opts.bar && size) this.bar.start(Math.floor(size / 1000) / 1000, 0);
		const options = {
			method: 'GET',
			retry: 20,
			agent: {
				http: new HttpAgent(),
				https: new HttpsAgent()
			},
			headers: {
				'user-agent': `KaraokeMugen/${getState().version.number}`
			}
		};
		let stream = createWriteStream(filename);
		if (this.opts.auth) options.auth = `${this.opts.auth.user}:${this.opts.auth.pass}`;
		got.stream(url, options)
			.on('response', res => {
				size = res.headers['content-length'];
				if (this.opts.bar) {
					this.bar.start(Math.floor(size / 1000) / 1000, 0);
				}
			})
			.on('downloadProgress', state => {
				if (this.opts.bar) {
					this.bar.update(Math.floor(state.transferred / 1000) / 1000);
				}
				emitWS('downloadProgress', {
					text: `Downloading : ${basename(filename)}`,
					value: state.transferred,
					total: size,
					id: id
				});
			})
			.on('error', err => {
				if (this.opts.bar) {
					this.bar.stop();
				}
				onError(err);
			})
			.on('end', () => {
				if (this.opts.bar) {
					this.bar.update((Math.floor(size / 1000)) / 1000);
					this.bar.stop();
				}
				onSuccess();
			})
			.pipe(stream);
	}
}