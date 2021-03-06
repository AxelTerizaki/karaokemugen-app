import { DownloadedStatus } from '../../lib/types/database/download';
import { DBKaraTag } from '../../lib/types/database/kara';
import { DBPLCBase } from '../../lib/types/database/playlist';
export interface DBPLCKID {
	kid: string,
	login: string,
	plcid: number,
	flag_playing: boolean
	pos: number,
	plaid: string,
	series: DBKaraTag[],
	singer: DBKaraTag[]
}

export interface DBPLPos {
	pos: number,
	plcid: number
}

export interface DBPLKidUser extends DBPLPos {
	flag_playing: boolean
}
export interface DBPLC extends DBPLCBase {
	flag_whitelisted: boolean,
	flag_blacklisted: boolean,
	upvotes: number,
	flag_upvoted: boolean,
	flag_visible: boolean,
	download_status: DownloadedStatus
}

export interface DBPLCInfo extends DBPLC {
	time_before_play: number
}