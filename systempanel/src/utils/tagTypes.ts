
export const tagTypes = Object.freeze({
	SERIES: 1,
	SINGERS: 2,
	SONGTYPES: 3,
	CREATORS: 4,
	LANGS: 5,
	AUTHORS: 6,
	MISC: 7,
	SONGWRITERS: 8,
	GROUPS: 9,
	FAMILIES: 10,
	ORIGINS: 11,
	GENRES: 12,
	PLATFORMS: 13
});

export function getTagTypeName(type: number): string {
	return Object.keys(tagTypes).find(t => tagTypes[t] === type);
}