const db = require('../_dao/user');
import {deletePlaylist} from '../_services/playlist';
import {getFavoritesPlaylist} from '../_dao/favorites';
import {detectFileType, asyncMove, asyncExists, asyncUnlink} from '../_common/utils/files';
import {getConfig} from '../_common/utils/config';
import {createPlaylist} from '../_services/playlist';
import {createHash} from 'crypto';
import {deburr} from 'lodash';
import {now} from 'unix-timestamp';
import {resolve} from 'path';
import logger from 'winston';
import uuidV4 from 'uuid/v4';
import {forever} from 'async';
import {promisify} from 'util';
const sleep = promisify(setTimeout);

async function updateExpiredUsers() {
	// Unflag onlien accounts from database if they expired
	await db.updateExpiredUsers(now() - (getConfig().AuthExpireTime * 60));
	await db.resetGuestsPassword();
	//Sleep for one minute.
	await sleep(60000);
}

export async function updateLastLoginID(id) {
	// Update last login time for a user
	return await db.updateUserLastLogin(id,now());
}

export async function updateLastLoginName(login) {
	const currentUser = await findUserByName(login);
	return await db.updateUserLastLogin(currentUser.id,now());
}

export async function validateUserName(login) {
	// Returns true if login name is free to use.
	if (!await findUserByName(login, {public :false})) return true;
	return false;
}

export async function validateUserNickname(nickname) {
	// Returns true if nickname is free to use.
	if (!await db.getUserByNickname(nickname)) return true;
	return false;
}

export async function editUser(username,user,avatar) {
	try {
		const currentUser = await findUserByName(username);
		if (currentUser.type == 2) throw 'Guests are not allowed to edit their profiles';
		user.id = currentUser.id;
		user.login = username;
		if (!user.bio) user.bio = null;
		if (!user.url) user.url = null;
		if (!user.email) user.email = null;
		// Check if login already exists.
		if (await db.checkNicknameExists(user.nickname, user.NORM_nickname) && currentUser.nickname != user.nickname) throw 'Nickname already exists';
		user.NORM_nickname = deburr(user.nickname);		
		if (user.password) {
			user.password = hashPassword(user.password);
			await db.updateUserPassword(username,user.password);
		}
		if (avatar) {
			// If a new avatar was sent, it is contained in the avatar object
			// Let's move it to the avatar user directory and update avatar info in 
			// database
			user.avatar_file = await replaceAvatar(currentUser.avatar_file,avatar);	
		} else {
			user.avatar_file = currentUser.avatar_file;
		}
		await db.editUser(user);
		logger.info(`[User] ${username} (${user.nickname}) profile updated`);	
		return user;
	} catch (err) {
		logger.error(`[User] Failed to update ${username}'s profile : ${err}`);
		const ret = {
			message: err,
			data: user.nickname
		};
		throw ret;
	}
}

export async function listGuests() {
	return await db.listGuests();
}

export async function listUsers() {
	return await db.listUsers();
}

async function replaceAvatar(oldImageFile,avatar) {
	try {
		const conf = getConfig();
		const fileType = await detectFileType(avatar.path);
		if (fileType != 'jpg' &&
				fileType != 'gif' &&
				fileType != 'png') {			
			throw 'Wrong avatar file type';			
		}
		// Construct the name of the new avatar file with its ID and filetype.
		const newAvatarFile = uuidV4()+ '.' + fileType;
		const newAvatarPath = resolve(conf.PathAvatars,newAvatarFile);
		const oldAvatarPath = resolve(conf.PathAvatars,oldImageFile);
		if (await asyncExists(oldAvatarPath) &&
			oldImageFile != 'blank.jpg') await asyncUnlink(oldAvatarPath);	
		await asyncMove(avatar.path,newAvatarPath);
		return newAvatarFile;
	} catch (err) {
		logger.error(`[User] Unable to replace avatar ${oldImageFile} with ${avatar.path} : ${err}`);
		throw err;
	}
}

export async function findUserByName(username, opt) {
	//Check if user exists in db
	if (!opt) opt = {};
	const userdata = await db.getUserByName(username);
	if (userdata) {
		if (!userdata.bio) userdata.bio = null;
		if (!userdata.url) userdata.url = null;
		if (!userdata.email) userdata.email = null;
		if (opt.public) {
			userdata.email = null;
			userdata.password = null;
			userdata.fingerprint = null;
			userdata.email = null;
		}
		return userdata;
	}
	return false;	
}

export async function findUserByID(id) {
	const userdata = await db.getUserByID(id);
	if (userdata) {
		if (!userdata.bio) userdata.bio = null;
		if (!userdata.url) userdata.url = null;
		if (!userdata.email) userdata.email = null;
		return userdata;
	}
	return false;
}

export function hashPassword(password) {
	const hash = createHash('sha256');
	hash.update(password);		
	return hash.digest('hex');
}

export async function checkPassword(username,password) {
	const hashedPassword = hashPassword(password);
	const user = await findUserByName(username, {public:false});
	// Access is granted only if passwords match OR user type is 2 (guest) and its password in database is empty.
	if (user.password === hashedPassword || (user.type === 2 && !user.password)) {
		// If password was empty for a guest, we set it to the password given on login.
		if (user.type === 2 && !user.password) await db.updateUserPassword(username,hashedPassword);
		return true;
	}
	return false;
}

export async function findFingerprint(fingerprint) {
	let guest = await db.findFingerprint(fingerprint);	
	if (guest) return guest.login;
	guest = await db.getRandomGuest();
	if (!guest) return false;
	await db.updateUserPassword(guest.id, hashPassword(fingerprint));
	return guest.login;
}

export async function updateUserFingerprint(username, fingerprint) {
	return await db.updateUserFingerprint(username, fingerprint);
}

export async function addUser(user) {
	let ret = {};
	user.nickname = user.login;
	user.password = hashPassword(user.password);
	user.last_login = now();
	user.NORM_nickname = deburr(user.nickname);
	if (!user.type) user.type = 1;
	if (user.type === 1 && user.password === null) {
		ret.code = 'USER_EMPTY_PASSWORD';
		throw ret;
	}
	user.flag_online = 1;
	user.flag_admin = 0;	
	
	// Check if login already exists.
	if (await db.checkUserNameExists(user.login) || await db.checkNicknameExists(user.login, deburr(user.login))) {
		ret.code = 'USER_ALREADY_EXISTS';
		ret.data = { username: user.login };
		ret.message = null;
		logger.error('[User] User/nickname '+user.login+' already exists, cannot create it');
		throw ret;
	}	
	try {
		await db.addUser(user);
		await createPlaylist(`Faves : ${user.login}`, 0, 0, 0, 1, user.login);
		logger.info(`[User] Created user ${user.login}`);
		logger.debug(`[User] User data : ${JSON.stringify(user)}`);
		return true;
	} catch(err) {
		ret.code = 'USER_CREATION_ERROR';
		ret.data = err;
		logger.error(`[User] Unable to create user ${user.login} : ${err}`);
		throw ret;
	}
}

export async function checkUserNameExists(username) {
	return await db.checkUserNameExists(username);	
}

export async function deleteUser(username) {
	if (!await db.checkUserNameExists(username)) {
		const ret = {
			code: 'USER_NOT_EXISTS',
			args: username
		};
		logger.error(`[User] User ${username} does not exist, unable to delete it`);
		throw ret;
	}
	try {
		const user = await findUserByName(username);
		const plInfo = await getFavoritesPlaylist(username);
		await deletePlaylist(plInfo.playlist_id, {force: true});
		await db.deleteUser(user.id);		
		logger.info(`[User] Deleted user ${username} (id ${user.id})`);
		return true;
	} catch (err) {
		const ret = {
			code: 'USER_DELETE_ERROR',
			data: err
		};
		logger.error(`[User] Unable to delete user ${username} : ${err}`);
		throw ret;
	}
}

export async function initUserSystem() {
	// Initializing user auth module
	// Expired guest accounts will be cleared on launch and every minute via repeating action
	forever((next) => {
		updateExpiredUsers()
			.then(() => {
				next();
			})
			.catch((err) => {
				logger.error(`[User] Expiring user accounts failed : ${err}`);
			});
	});
}


