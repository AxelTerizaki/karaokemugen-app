// SQL queries for user manipulation

export const testNickname = `
SELECT pk_login
FROM users
WHERE nickname = :nickname
`;

export const reassignPlaylistToUser = 'UPDATE playlist SET fk_login = :username WHERE fk_login = :old_username;';

export const reassignPlaylistContentToUser = 'UPDATE playlist_content SET fk_login = :username WHERE fk_login = :old_username;';

export const selectUserByName = `
SELECT
	u.type AS type,
	u.pk_login AS login,
	u.password AS password,
	u.nickname AS nickname,
	u.avatar_file AS avatar_file,
	u.bio AS bio,
	u.url AS url,
	u.email AS email,
	u.fingerprint AS fingerprint,
	u.last_login_at AS last_login_at,
	u.flag_online AS flag_online
FROM users AS u
WHERE u.pk_login = :username
`;

export const selectRandomGuestName = `
SELECT pk_login AS login
FROM users
WHERE type = 2
	AND flag_online = FALSE
ORDER BY RANDOM() LIMIT 1;
`;

export const selectGuests = `
SELECT
	u.nickname AS nickname,
	u.pk_login AS login,
	u.avatar_file AS avatar_file,
	(fingerprint IS NULL) AS available
FROM users AS u
WHERE u.type = 2;
`;

export const selectUsers = `
SELECT
	u.type AS type,
	u.avatar_file AS avatar_file,
	u.pk_login AS login,
	u.nickname AS nickname,
	u.last_login_at AS last_login_at,
	u.flag_online AS flag_online
FROM users AS u
ORDER BY u.flag_online DESC, u.nickname
`;

export const deleteUser = `
DELETE FROM users
WHERE pk_login = $1;
`;

export const createUser = `
INSERT INTO users(
	type,
	pk_login,
	password,
	nickname,
	flag_online,
	last_login_at
)
VALUES (
	:type,
	:login,
	:password,
	:nickname,
	:flag_online,
	:last_login_at
);
`;

export const updateExpiredUsers = `
UPDATE users SET
	fingerprint = NULL,
	flag_online = FALSE
WHERE last_login_at <= $1;
`;

export const updateLastLogin = `
UPDATE users SET
	last_login_at = :now,
	flag_online = TRUE
WHERE pk_login = :username;
`;

export const updateUserFingerprint = `
UPDATE users SET
	fingerprint = :fingerprint,
	flag_online = TRUE
WHERE pk_login = :username;
`;

export const findFingerprint = `
SELECT pk_login
FROM users
WHERE fingerprint = $1;
`;

export const resetGuestsPassword = `
UPDATE users SET
	password = null
WHERE flag_online = FALSE
AND type = 2
`;

export const editUser = `
UPDATE users SET
	pk_login = :login,
	nickname = :nickname,
	avatar_file = :avatar_file,
	bio = :bio,
	email = :email,
	url = :url,
	type = :type
WHERE pk_login = :old_login
`;

export const editUserPassword = `
UPDATE users SET
	password = :password
WHERE pk_login = :username
`;
