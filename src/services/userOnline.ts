import formData from 'form-data';
import { createReadStream } from 'fs-extra';
import { resolve } from 'path';

import { getRemoteToken, upsertRemoteToken } from '../dao/user';
import { Token, User } from '../lib/types/user';
import { resolvedPathAvatars, resolvedPathTemp } from '../lib/utils/config';
import { writeStreamToFile } from '../lib/utils/files';
import HTTP from '../lib/utils/http';
import logger from '../lib/utils/logger';
import { emitWS } from '../lib/utils/ws';
import { SingleToken, Tokens } from '../types/user';
import sentry from '../utils/sentry';
import { convertToRemoteFavorites } from './favorites';
import { checkPassword, createJwtToken, createUser, editUser, findUserByName } from './user';

/** Check if the online token we have is still valid on KM Server */
export async function remoteCheckAuth(instance: string, token: string) {
	try {
		const res = await HTTP.get(`https://${instance}/api/auth/check`, {
			headers: {
				authorization: token
			}
		});
		return res.body;
	} catch(err) {
		if (err.response?.statusCode === 403) return false;
		logger.debug('Got error when check auth', {service: 'RemoteUser', obj: err});
		throw err;
	}
}

/** Function called when you enter a login/password and login contains an @. We're checking login/password pair against KM Server  */
export async function remoteLogin(username: string, password: string): Promise<Token> {
	const [login, instance] = username.split('@');
	try {
		const res = await HTTP.post(`https://${instance}/api/auth/login`, {
			form: {
				username: login,
				password: password
			}
		});
		return JSON.parse(res.body);
	} catch(err) {
		// Remote login returned 401 so we throw an error
		// For other errors, no error is thrown
		if (err.statusCode === 401) throw 'Unauthorized';
		logger.debug(`Got error when connectiong user ${username}`, {service: 'RemoteUser', obj: err});
		return {
			token: null,
			role: null,
			username: null
		};
	}
}

export async function resetRemotePassword(user: string) {
	const [username, instance] = user.split('@');
	try {
		await HTTP.post(`https://${instance}/api/users/${username}/resetpassword`);
	} catch (err) {
		logger.error(`Could not trigger reset password for ${user}`, {service: 'RemoteUser', obj: err});
		throw err;
	}
}

/** Get all users from KM Server */
async function getAllRemoteUsers(instance: string): Promise<User[]> {
	try {
		const users = await HTTP(`https://${instance}/api/users`,
			{
				responseType: 'json'
			});
		return users.body as User[];
	} catch(err) {
		logger.debug('Got error when get all remote users', {service: 'RemoteUser', obj: err});
		throw {
			code: 500,
			msg: 'USER_GET_ERROR_ONLINE',
			message: err
		};
	}
}

/** Create a user on KM Server */
export async function createRemoteUser(user: User) {
	const [login, instance] = user.login.split('@');
	const users = await getAllRemoteUsers(instance);
	if (users.filter(u => u.login === login).length === 1) throw {
		code: 409,
		msg: 'USER_ALREADY_EXISTS_ONLINE',
		message: `User already exists on ${instance} or incorrect password`
	};
	try {
		await HTTP.post(`https://${instance}/api/users`, {
			form: {
				login: login,
				password: user.password
			}
		});
	} catch(err) {
		logger.debug(`Got error when create remote user ${login}`, {service: 'RemoteUser', obj: err});
		throw {
			code: 500,
			msg: 'USER_CREATE_ERROR_ONLINE',
			message: err
		};
	}
}

/** Get user data from KM Server */
export async function getRemoteUser(username: string, token: string): Promise<User> {
	const [login, instance] = username.split('@');
	try {
		const res = await HTTP(`https://${instance}/api/users/${login}`, {
			headers: {
				authorization: token
			},
			responseType: 'json'
		});
		return res.body;
	} catch(err) {
		sentry.error(err);
		if (err.statusCode === 401) throw 'Unauthorized';
		throw `[RemoteUser] Got error when get remote user ${username} : ${err}`;
	}
}

/** Edit online user's profile, including avatar. */
export async function editRemoteUser(user: User) {
	// Fetch remote token
	const remoteToken = getRemoteToken(user.login);
	const [login, instance] = user.login.split('@');
	const form = new formData();

	// Create the form data sent as payload to edit remote user
	if (user.avatar_file !== 'blank.png') form.append('avatarfile', createReadStream(resolve(resolvedPathAvatars(), user.avatar_file)), user.avatar_file);
	form.append('nickname', user.nickname);
	if (user.bio) form.append('bio', user.bio);
	if (user.email) form.append('email', user.email);
	if (user.url) form.append('url', user.url);
	if (user.password) form.append('password', user.password);
	if (user.series_lang_mode) form.append('series_lang_mode', user.series_lang_mode);
	if (user.main_series_lang) form.append('main_series_lang', user.main_series_lang);
	if (user.fallback_series_lang) form.append('fallback_series_lang', user.fallback_series_lang);
	try {
		const res = await HTTP.put(`https://${instance}/api/users/${login}`, {
			body: form,
			headers: {
				authorization: remoteToken.token || null
			}
		});
		return JSON.parse(res.body);
	} catch(err) {
		sentry.error(err);
		throw `Remote update failed : ${err}`;
	}
}

/** Get remote avatar from KM Server */
export async function fetchRemoteAvatar(instance: string, avatarFile: string): Promise<string> {
	// If this stops working, use got() and a stream: true property again
	const res = HTTP.stream(`https://${instance}/avatars/${avatarFile}`);
	let avatarPath: string;
	try {
		avatarPath = resolve(resolvedPathTemp(), avatarFile);
		await writeStreamToFile(res, avatarPath);
	} catch(err) {
		logger.warn(`Could not write remote avatar to local file ${avatarFile}`, {service: 'User', obj: err});
		throw err;
	}
	return avatarPath;
}

/** Login as online user on KM Server and fetch profile data, avatar, favorites and such and upserts them in local database */
export async function fetchAndUpdateRemoteUser(username: string, password: string, onlineToken?: Token): Promise<User> {
	// We try to login to KM Server using the provided login password.
	// If login is successful, we get user profile data and create user if it doesn't exist already in our local database.
	// If it exists, we edit the user instead.
	if (!onlineToken) onlineToken = await remoteLogin(username, password);
	// if OnlineToken is empty, it means we couldn't fetch user data, let's not continue but don't throw an error
	if (onlineToken.token) {
		let remoteUser: User;
		try {
			remoteUser = await getRemoteUser(username, onlineToken.token);
		} catch(err) {
			sentry.error(err);
			throw err;
		}
		// Check if user exists. If it does not, create it.
		let user = await findUserByName(username);
		if (!user) {
			await createUser({
				login: username,
				password: password
			}, {
				createRemote: false,
				noPasswordCheck: true
			});
		}
		// Update user with new data
		let avatar_file = null;
		if (remoteUser.avatar_file && remoteUser.avatar_file !== 'blank.png') {
			let avatarPath: string;
			try {
				avatarPath = await fetchRemoteAvatar(username.split('@')[1], remoteUser.avatar_file);
			} catch(err) {
				sentry.error(err);
			}
			if (avatarPath) avatar_file = {
				path: avatarPath
			};
		}
		// Checking if user has already been fetched during this session or not
		if (!usersFetched.has(username)) {
			usersFetched.add(username);
			const response = await editUser(
				username,
				{
					bio: remoteUser.bio,
					url: remoteUser.url,
					email: remoteUser.email,
					nickname: remoteUser.nickname,
					password: password,
					series_lang_mode: remoteUser.series_lang_mode,
					main_series_lang: remoteUser.main_series_lang,
					fallback_series_lang: remoteUser.fallback_series_lang
				},
				avatar_file,
				'admin',
				{ editRemote: false, noPasswordCheck: true	}
			);
			user = response.user;
		}
		user.onlineToken = onlineToken.token;
		return user;
	} else {
		//Onlinetoken was not provided : KM Server might be offline
		//We'll try to find user in local database. If failure return an error
		const user = await findUserByName(username);
		if (!user) throw {code: 'USER_LOGIN_ERROR'};
		return user;
	}
}

export const usersFetched = new Set();

export function getUsersFetched() {
	return usersFetched;
}

/** Converts a online user to a local one by removing its online account from KM Server */
export async function removeRemoteUser(token: Token, password: string): Promise<SingleToken> {
	const instance = token.username.split('@')[1];
	const username = token.username.split('@')[0];
	// Verify that no local user exists with the name we're going to rename it to
	if (await findUserByName(username)) throw {code: 409, msg: 'User already exists locally, delete it first.'};
	// Verify that password matches with online before proceeding
	const onlineToken = await remoteLogin(token.username, password);
	await HTTP(`https://${instance}/api/users`, {
		method: 'DELETE',
		headers: {
			authorization: onlineToken.token
		}
	});
	// Renaming user locally
	const user = await findUserByName(token.username);
	user.login = username;
	await editUser(token.username, user, null, 'admin', {
		editRemote: false,
		renameUser: true
	});
	emitWS('userUpdated', token.username);
	return {
		token: createJwtToken(user.login, token.role)
	};
}

/** Converting a local account to a online one.	*/
export async function convertToRemoteUser(token: Token, password: string , instance: string): Promise<Tokens> {
	if (token.username === 'admin') throw {code: 'ADMIN_CONVERT_ERROR'};
	const user = await findUserByName(token.username);
	if (!user) throw {msg: 'UNKNOW_CONVERT_ERROR'};
	if (!await checkPassword(user, password)) throw {msg: 'PASSWORD_CONVERT_ERROR'};
	user.login = `${token.username}@${instance}`;
	user.password = password;
	try {
		await createRemoteUser(user);
		const remoteUser = await remoteLogin(user.login, password);
		upsertRemoteToken(user.login, remoteUser.token);
		await editUser(token.username, user, null, token.role, {
			editRemote: false,
			renameUser: true
		});
		await convertToRemoteFavorites(user.login);
		emitWS('userUpdated', user.login);
		return {
			onlineToken: remoteUser.token,
			token: createJwtToken(user.login, token.role)
		};
	} catch(err) {
		if (err.msg !== 'USER_ALREADY_EXISTS_ONLINE') sentry.error(err);
		throw {msg: err.msg || 'USER_CONVERT_ERROR', details: err};
	}
}
