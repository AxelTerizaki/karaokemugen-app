import { DBPLCBase } from '../lib/types/database/playlist';
import {KaraParams} from '../lib/types/kara';

export interface PLCEditParams {
	flag_playing?: boolean,
	flag_free?: boolean,
	flag_visible?: boolean,
	flag_accepted?: boolean,
	flag_refused?: boolean,
	pos?: number
}

export interface CurrentSong extends DBPLCBase {
	avatar?: string,
	infos?: string
}

export interface PLC {
	plaid: number,
	plcid?: number,
	username?: string,
	nickname?: string,
	kid?: string,
	created_at?: Date,
	pos?: number,
	flag_playing?: boolean,
	flag_visible?: boolean,
	flag_free?: boolean,
	flag_refused?: boolean,
	flag_accepted?: boolean,
	duration?: number,
	uniqueSerieSinger?: string,
	title?: string,
	type?: string
}

export interface PlaylistExport {
	Header?: {
		version: number,
		description: string
	},
	PlaylistInformation?: any,
	PlaylistContents?: PlaylistExportKara[]
}

interface PlaylistExportKara {
	kid: string,
	username: string,
	nickname: string,
	created_at: Date,
	pos: number
}

export interface Pos {
	index: number,
	plc_id_pos: number
}

export interface PLCParams extends KaraParams {
	plaid: number,
	orderByLikes: boolean,
}

export interface PlaylistOpts {
	visible?: boolean,
	current?: boolean,
	public?: boolean,
	autoSortByLike?: boolean
}

export type ShuffleMethods = 'normal' | 'smart' | 'balance' | 'upvotes';
