import { Repo } from '../types/repo';
import { selectRepos } from '../dao/repo';

/** Get all repositories in database */
export async function getRepos(): Promise<Repo[]> {
	return await selectRepos();
}