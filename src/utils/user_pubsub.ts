import { io, Socket } from 'socket.io-client';

import { DBUser } from '../lib/types/database/user';
import logger from '../lib/utils/logger';
import {importFavorites} from '../services/favorites';
import { deleteUser, editUser, listUsers } from '../services/user';
import { Favorite } from '../types/stats';

// Map io connections
const ioMap: Map<string, Socket> = new Map();

async function listRemoteUsers() {
	const users = await listUsers();
	return users.filter(u => u.login.includes('@')).map(u => u.login);
}

function setupUserWatch(server: string) {
	const socket = io(`https://${server}`, { multiplex: true });
	ioMap.set(server, socket);
	socket.on('user updated', (payload) => {
		const user: DBUser = payload.user;
		const favorites: Favorite[] = payload.favorites;
		const login = `${user.login}@${server}`;
		delete user.login;
		delete user.type;
		delete user.avatar_file;
		logger.debug(`${login} user was updated on remote`, { service: 'RemoteUser' });
		Promise.all([
			editUser(login, user, null, 'admin'),
			importFavorites({
				Header: { version: 1, description: 'Karaoke Mugen Favorites List File' },
				Favorites: favorites
			}, login, undefined, true)
		]).catch(err => {
			logger.warn(`Cannot update remote user ${login}`, { service: 'RemoteUser', obj: err });
		});
	});
	socket.on('user deleted', user => {
		const login = `${user}@${server}`;
		try {
			logger.info(`${login} user was DELETED on remote, delete local account`, { service: 'RemoteUser' });
			deleteUser(login).catch(err => {
				logger.warn(`Cannot remove remote user ${login}`, { service: 'RemoteUser', obj: err });
			});
		} catch (err) {
			logger.warn(`Cannot delete ${login}`, { service: 'RemoteUser' });
		}
	});
}

export function startSub(user: string, server: string) {
	if (!ioMap.has(server)) {
		setupUserWatch(server);
	}
	const socket = ioMap.get(server);
	socket.emit('subscribe user', { body: user }, res => {
		if (res.err) {
			logger.warn(`Cannot watch user ${user}@${server}`, { service: 'RemoteUser', obj: res });
			return;
		}
		if (res.data === false) {
			const name = `${user}@${server}`;
			try {
				logger.info(`User ${name} doesn't exist on remote, delete local version.`, { service: 'RemoteUser' });
				deleteUser(name);
			} catch (err) {
				logger.warn(`Cannot delete ${name}`, { service: 'RemoteUser' });
			}
		}
	});
}

export function stopSub(user: string, server: string) {
	if (!ioMap.has(server)) {
		return;
	}
	const socket = ioMap.get(server);
	socket.emit('unsubscribe user', user);
}

export async function subRemoteUsers() {
	logger.debug('Starting watching users online', { service: 'RemoteUser' });
	const users = await listRemoteUsers();
	for (const user of users) {
		const [login, instance] = user.split('@');
		startSub(login, instance);
	}
}