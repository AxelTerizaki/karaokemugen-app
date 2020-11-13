import randomstring from 'randomstring';

import { upsertRemoteToken } from '../dao/user';
import { Role, Token, User } from '../lib/types/user';
import { getConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { getState, setState } from '../utils/state';
import { fetchAndAddFavorites } from './favorites';
import { checkPassword, createJwtToken, findUserByName, updateLastLoginName } from './user';
import { fetchAndUpdateRemoteUser } from './userOnline';

/** Check login and authenticates users */
export async function checkLogin(username: string, password: string): Promise<Token> {
	const conf = getConfig();
	let user: User = {};
	let onlineToken: string;
	if (username.includes('@') && +conf.Online.Users) {
		try {
			// If username has a @, check its instance for existence
			// If OnlineUsers is disabled, accounts are connected with
			// their local version if it exists already.
			const instance = username.split('@')[1];
			user = await fetchAndUpdateRemoteUser(username, password);
			onlineToken = user.onlineToken;
			if (onlineToken) {
				upsertRemoteToken(username, onlineToken);
				// Download and add all favorites
				fetchAndAddFavorites(instance, onlineToken, username);
			}
		} catch(err) {
			logger.error(`Failed to authenticate ${username}`, {service: 'RemoteAuth', obj: err});
		}
	}

	// User is a local user
	user = await findUserByName(username);
	if (!user) throw false;
	if (!await checkPassword(user, password)) throw false;
	const role = getRole(user);
	updateLastLoginName(username);
	return {
		token: createJwtToken(username, role, conf),
		onlineToken: onlineToken,
		username: username,
		role: role
	};
}

export function resetSecurityCode() {
	setState({ securityCode: generateSecurityCode()});
	logger.warn(`SECURITY CODE : ${getState().securityCode}`, {service: 'Users'});
}

function generateSecurityCode(): number {
	return parseInt(randomstring.generate({
		length: 6,
		charset: 'numeric'
	}));
}


/** Get role depending on user type */
function getRole(user: User): Role {
	if (+user.type === 2) return 'guest';
	if (+user.type === 0) return 'admin';
	if (+user.type === 1) return 'user';
	return 'guest';
}