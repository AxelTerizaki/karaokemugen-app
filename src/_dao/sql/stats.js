// SQL for stats

export const exportPlayed = 'SELECT fk_kid AS kid, session_started_at, played_at FROM played';

export const exportRequested = 'SELECT fk_kid AS kid, session_started_at, requested_at FROM requested';

export const exportFavorites = `
SELECT f.fk_kid AS kid
FROM favorites f
WHERE f.fk_login NOT LIKE '%@%';
`;