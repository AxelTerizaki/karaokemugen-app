export const selectDownloads = `
SELECT name,
	urls,
	size,
	status,
	pk_uuid,
	started_at
FROM download
ORDER BY started_at DESC
`;

export const selectPendingDownloads = `
SELECT name,
	urls,
	size,
	status,
	pk_uuid,
	started_at
FROM download
WHERE status = 'DL_PLANNED'
ORDER BY started_at DESC
`;

export const selectDownload = `
SELECT name,
	urls,
	size,
	status,
	pk_uuid,
	started_at
FROM download
WHERE pk_uuid = $1
`;

export const updateRunningDownloads = `
UPDATE download
SET status = 'DL_PLANNED'
WHERE status = 'DL_RUNNING'
`;

export const deleteDoneFailedDownloads = `
DELETE FROM download
WHERE status = 'DL_DONE' OR status = 'DL_FAILED'
`;

export const insertDownload = `
INSERT INTO download(
	name,
	urls,
	size,
	status,
	pk_uuid
) VALUES(
	$1,
	$2,
	$3,
	$4,
	$5)
`;

export const updateDownloadStatus = `
UPDATE download
SET status = $2
WHERE pk_uuid = $1
`;

export const deleteDownload = `
DELETE FROM download
WHERE pk_uuid = $1
`;

export const emptyDownload = 'TRUNCATE download CASCADE';
