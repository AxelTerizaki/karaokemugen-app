import i18next from 'i18next';
import { io, Socket } from 'socket.io-client';

import { displayMessage, eventEmitter } from './tools';

let socket: Socket;
let proxy: boolean;
let authorization;
let onlineAuthorization;

if (document.querySelector<HTMLMetaElement>('meta[name="target"]').content === 'NO-REMOTE') {
	socket = io();
	proxy = false;
} else {
	socket = io(`/${document.querySelector<HTMLMetaElement>('meta[name="target"]').content}`);
	proxy = true;
}

export function setAuthorization(authorizationParam:string, onlineAuthorizationParam:string) {
	authorization = authorizationParam;
	if (!authorizationParam || onlineAuthorizationParam) onlineAuthorization = onlineAuthorizationParam;
}

export function commandBackend(name: string, body?: any, loading = false, timeout = 5000): Promise<any> {
	return new Promise((resolve, reject) => {
		if (loading) eventEmitter.emitChange('loading', true);
		const nodeTimeout = setTimeout((reason) => {
			console.log(name, body, 'timeout');
			reject(reason);
		}, timeout);
		const t0 = performance.now();
		socket.emit(name, {authorization, onlineAuthorization, body}, ({err, data}:{err: boolean, data: any}) => {
			clearTimeout(nodeTimeout);
			const t1 = performance.now();
			console.log(name, `${t1 - t0}ms` , body, data);
			if (loading) eventEmitter.emitChange('loading', false);
			if (!err && data?.code && typeof data.data !== 'object') {
				displayMessage('success', i18next.t(`SUCCESS_CODES.${data.code}`, {data: data.data}));
			} else if (err && data?.message?.code && typeof data.data !== 'object') {
				displayMessage('error', i18next.t(`ERROR_CODES.${data.message.code}`, {data: data.data}));
			}
			err ? reject(data) : resolve(data);
		});
	});
}

socket.on('error', (err) => {
	displayMessage('error', i18next.t(`ERROR_CODES.${err.code}`, {repo: err.data?.repo.Name, err: err.data?.err}));
});

export function getSocket() {
	return socket;
}

export function isRemote() {
	return proxy;
}