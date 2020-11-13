import i18next from 'i18next';
import prettyBytes from 'pretty-bytes';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { User } from '../../../../../src/lib/types/user';
import { BLCSet } from '../../../../../src/types/blacklist';
import { DBPL, DBPLC } from '../../../../../src/types/database/playlist';
import { setFilterValue } from '../../../store/actions/frontendContext';
import { setSettings } from '../../../store/actions/settings';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { callModal, displayMessage, getTuto, is_touch_device } from '../../../utils/tools';
import { Tag } from '../../types/tag';
import Autocomplete from '../generic/Autocomplete';
import SelectWithIcon from '../generic/SelectWithIcon';
import BlcSetCopyModal from '../modals/BlcSetCopyModal';
import FavMixModal from '../modals/FavMixModal';
import ShuffleModal from '../modals/ShuffleModal';
import ActionsButtons from './ActionsButtons';
require('./PlaylistHeader.scss');

const tagsTypesList = [
	'BLCTYPE_1',
	'BLCTYPE_3',
	'BLCTYPE_2',
	'BLCTYPE_4',
	'BLCTYPE_5',
	'BLCTYPE_6',
	'DETAILS_YEAR',
	'BLCTYPE_8',
	'BLCTYPE_9',
	'BLCTYPE_7',
	'BLCTYPE_10',
	'BLCTYPE_11',
	'BLCTYPE_12',
	'BLCTYPE_13',];

interface IProps {
	idPlaylist: number;
	bLSet?: BLCSet;
	idPlaylistTo: number;
	scope: string;
	side: number;
	playlistInfo: DBPL | undefined;
	tags: Array<Tag> | undefined;
	playlistList: Array<PlaylistElem>;
	searchMenuOpen?: boolean;
	bLSetList: BLCSet[];
	checkedkaras: number;
	changeIdPlaylist: (idPlaylist: number, idBLSet?: number) => void;
	playlistWillUpdate: () => void;
	playlistDidUpdate: () => void;
	getPlaylist: (searchType?: string) => void;
	onChangeTags: (type: number | string, value: string) => void;
	editNamePlaylist: () => void;
	addAllKaras: () => void;
	selectAllKaras: () => void;
	transferCheckedKaras: () => void;
	deleteCheckedKaras: () => void;
	addCheckedKaras: () => void;
	toggleSearchMenu?: () => void;
	addRandomKaras: () => void;
}

interface IState {
	selectAllKarasChecked: boolean;
	tagType: number | string;
	activeFilter: number;
	activeFilterUUID: string;
	playlistCommands: boolean;
}

class PlaylistHeader extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			playlistCommands: false,
			selectAllKarasChecked: false,
			tagType: 2,
			activeFilter: 1,
			activeFilterUUID: ''
		};
	}

	addPlaylist = () => {
		this.togglePlaylistCommands();
		if (this.props.idPlaylist === -4) {
			callModal('prompt', i18next.t('BLC.ADD'), '', (playlistName: string) => {
				commandBackend('createBLCSet', { name: playlistName, flag_current: false }).then(response => {
					this.props.changeIdPlaylist(-4, response.id);
				});
			});
		} else {
			callModal('prompt', i18next.t('CL_CREATE_PLAYLIST'), '', (playlistName: string) => {
				commandBackend('createPlaylist', { name: playlistName, flag_visible: true, flag_current: false, flag_public: false }).then(response => {
					this.props.changeIdPlaylist(response);
				});
			});
		}
	};

	deletePlaylist = () => {
		this.togglePlaylistCommands();
		if (this.props.idPlaylist === -4 && this.props.bLSet?.flag_current) {
			displayMessage('warning', i18next.t('BLC.DELETE_CURRENT'));
		} else if (this.props.playlistInfo?.flag_current && this.props.playlistInfo?.flag_public) {
			displayMessage('warning', i18next.t('ADVANCED.DELETE_CURRENT_PUBLIC'));
		} else if (this.props.playlistInfo?.flag_public) {
			displayMessage('warning', i18next.t('ADVANCED.DELETE_PUBLIC'));
		} else if (this.props.playlistInfo?.flag_current) {
			displayMessage('warning', i18next.t('ADVANCED.DELETE_CURRENT'));
		} else {
			callModal('confirm',
				i18next.t('CL_DELETE_PLAYLIST',
					{
						playlist: this.props.idPlaylist === -4 ?
							this.props.bLSet?.name :
							(this.props.playlistInfo as DBPL).name
					}),
				'',
				(confirm: boolean) => {
					if (confirm) {
						const url = this.props.idPlaylist === -4 ? 'deleteBLCSet' : 'deletePlaylist';
						const data = this.props.idPlaylist === -4 ?
							{ set_id: this.props.bLSet?.blc_set_id } :
							{ pl_id: this.props.idPlaylist };
						commandBackend(url, data);
						if (this.props.idPlaylist === -4) {
							this.props.changeIdPlaylist(-4);
						} else {
							this.props.changeIdPlaylist(this.context.globalState.settings.data.state.publicPlaylistID);
						}
					}
				});
		}
	};

	startFavMix = async () => {
		this.togglePlaylistCommands();
		const response = await commandBackend('getUsers');
		const userList = response.filter((u: User) => (u.type as number) < 2);
		ReactDOM.render(<FavMixModal changeIdPlaylist={this.props.changeIdPlaylist} userList={userList} />, document.getElementById('modal'));
	};

	exportPlaylist = async () => {
		this.togglePlaylistCommands();
		let url;
		let data;
		if (this.props.idPlaylist === -4) {
			url = 'exportBLCSet';
			data = { set_id: this.props.bLSet?.blc_set_id };
		} else if (this.props.idPlaylist === -5) {
			url = 'exportFavorites';
		} else if (this.props.idPlaylist > 0) {
			url = 'exportPlaylist';
			data = { pl_id: this.props.idPlaylist };
		}
		if (url) {
			const response = await commandBackend(url, data);
			const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(response, null, 4));
			const dlAnchorElem = document.getElementById('downloadAnchorElem');
			if (dlAnchorElem) {
				dlAnchorElem.setAttribute('href', dataStr);
				if (this.props.idPlaylist === -4) {
					dlAnchorElem.setAttribute('download', ['KaraMugen', this.props.bLSet?.name, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmblc');
				} else if (this.props.idPlaylist === -5) {
					dlAnchorElem.setAttribute('download', ['KaraMugen', 'fav', this.context.globalState.auth.data.username, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmfavorites');
				} else {
					dlAnchorElem.setAttribute('download', ['KaraMugen', (this.props.playlistInfo as DBPL).name, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmplaylist');
				}
				dlAnchorElem.click();
			}
		}
	};

	importPlaylist = (e: any) => {
		this.togglePlaylistCommands();
		let url: string;
		let fr: FileReader;
		let file: File;
		if (!window.FileReader) return alert('FileReader API is not supported by your browser.');
		if (e.target.files && e.target.files[0]) {
			file = e.target.files[0];
			fr = new FileReader();
			fr.onload = async () => {
				const data: {
					playlist?: string | ArrayBuffer | null,
					favorites?: string | ArrayBuffer | null,
					blcSet?: string | ArrayBuffer | null
				} = {};
				let name: string;
				if (file.name.includes('.kmblc')) {
					data.blcSet = fr.result;
					url = 'importBLCSet';
					name = JSON.parse(fr.result as string).blcSetInfo.name;
				} else if (file.name.includes('.kmfavorites')) {
					data.favorites = fr.result;
					url = 'importFavorites';
					name = 'Favs';
				} else {
					url = 'importPlaylist';
					data.playlist = fr.result;
					name = JSON.parse(fr.result as string).PlaylistInformation.name;
				}
				const response = await commandBackend(url, { buffer: data });
				if (response.unknownKaras && response.unknownKaras.length > 0) {
					const mediasize = response.unknownKaras.reduce((accumulator, currentValue) => accumulator + currentValue.mediasize, 0);
					callModal('confirm', i18next.t('MODAL.UNKNOW_KARAS.TITLE'), (<React.Fragment>
						<p>
							{i18next.t('MODAL.UNKNOW_KARAS.DESCRIPTION')}
						</p>
						<div>
							{i18next.t('MODAL.UNKNOW_KARAS.DOWNLOAD_THEM')}
							<label>&nbsp;{i18next.t('MODAL.UNKNOW_KARAS.DOWNLOAD_THEM_SIZE', { mediasize: prettyBytes(mediasize) })}</label>
						</div>
						<br />
						{response.unknownKaras.map((kara: DBPLC) =>
							<label key={kara.kid}>{buildKaraTitle(this.context.globalState.settings.data, kara, true)}</label>)}
					</React.Fragment>), () => commandBackend('addDownloads', {
						downloads: response.unknownKaras.map((kara: DBPLC) => {
							return {
								kid: kara.kid,
								mediafile: kara.mediafile,
								size: kara.mediasize,
								name: kara.karafile.replace('.kara.json', ''),
								repository: kara.repository
							};
						})
					}));
				} else {
					!file.name.includes('.kmfavorites') &&
						displayMessage('success', i18next.t(i18next.t(`SUCCESS_CODES.${response.code}`, { data: name })));
				}
				const playlist_id = file.name.includes('.kmfavorites') ? -5 : response.playlist_id;
				this.props.changeIdPlaylist(playlist_id);
			};
			fr.readAsText(file);
		}
	};

	deleteAllKaras = () => {
		this.togglePlaylistCommands();
		if (this.props.idPlaylist === -2 || this.props.idPlaylist === -4) {
			commandBackend('emptyBLCSet', { set_id: this.props.bLSet?.blc_set_id });
		} else if (this.props.idPlaylist === -3) {
			commandBackend('emptyWhitelist');
		} else {
			commandBackend('emptyPlaylist', { pl_id: this.props.idPlaylist });
		}
	};

	setFlagCurrent = async () => {
		this.togglePlaylistCommands();
		if (this.props.idPlaylist === -4 && !this.props.bLSet?.flag_current) {
			commandBackend('setCurrentBLCSet', { set_id: this.props.bLSet?.blc_set_id });
		} else if (!(this.props.playlistInfo as DBPL).flag_current) {
			await commandBackend('setCurrentPlaylist', { pl_id: this.props.idPlaylist });
		}
		setSettings(this.context.globalDispatch);
	};

	setFlagPublic = async () => {
		this.togglePlaylistCommands();
		if (!(this.props.playlistInfo as DBPL).flag_public) {
			await commandBackend('setPublicPlaylist', { pl_id: this.props.idPlaylist });
			setSettings(this.context.globalDispatch);
		}
	};

	setFlagVisible = () => {
		this.togglePlaylistCommands();
		commandBackend('editPlaylist', {
			name: (this.props.playlistInfo as DBPL).name,
			flag_visible: !(this.props.playlistInfo as DBPL).flag_visible,
			pl_id: this.props.idPlaylist
		});
	};

	getKarasList = (activeFilter: number, searchType?: string) => {
		this.setState({ activeFilter: activeFilter });
		if (activeFilter === 2 && this.props.idPlaylist !== -5) {
			this.props.changeIdPlaylist(-5);
		} else if (activeFilter !== 2 && this.props.idPlaylist !== -1) {
			this.props.changeIdPlaylist(-1);
			this.props.getPlaylist(searchType);
		} else {
			this.props.getPlaylist(searchType);
		}
	};

	onChangeTags = (value: string) => {
		this.setState({ activeFilterUUID: value });
		this.props.onChangeTags(this.state.tagType, value);
	};

	getPlaylistIcon(playlist: PlaylistElem) {
		// public & current playlist :  play-circle & globe icons
		if (playlist.flag_public && playlist.flag_current) return ['fa-play-circle', 'fa-globe'];
		// public playlist : globe icon
		if (playlist.flag_public) return ['fa-globe'];
		// current playlist : play-circle icon
		if (playlist.flag_current) return ['fa-play-circle'];
		// library : book icon
		if (playlist.playlist_id === -1) return ['fa-book'];
		// blacklist : ban icon
		if (playlist.playlist_id === -2) return ['fa-ban'];
		// whitelist : check-circle icon
		if (playlist.playlist_id === -3) return ['fa-check-circle'];
		// blacklist criterias : not-equal icon
		if (playlist.playlist_id === -4) return ['fa-not-equal'];
		// favorites : star icon
		if (playlist.playlist_id === -5) return ['fa-star'];
		// others playlist : list-ol icon
		return ['fa-list-ol'];
	}

	getListToSelect = () => {
		if (this.props.scope === 'public' && this.props.side === 1 && this.context?.globalState.settings.data.config?.Frontend.Mode === 1) {
			return [{
				value: this.context.globalState.settings.data.state.currentPlaylistID.toString(),
				label: this.props.playlistList.filter(pl => pl.playlist_id === this.context.globalState.settings.data.state.currentPlaylistID)[0].name
			}];
		}
		if (this.props.scope === 'public' && this.props.side === 1) {
			return [{ value: '-1', label: i18next.t('PLAYLIST_KARAS') }, { value: '-5', label: i18next.t('PLAYLIST_FAVORITES') }];
		}
		return this.props.playlistList.map(playlist => {
			return { value: playlist.playlist_id.toString(), label: playlist.name, icons: this.getPlaylistIcon(playlist) };
		});
	}

	getFlagLabel = (playlist: PlaylistElem) => {
		if (playlist.flag_public && playlist.flag_current) return ` (${i18next.t('FLAGS.CURRENT_PUBLIC')})`;
		if (playlist.flag_public) return ` (${i18next.t('FLAGS.PUBLIC')})`;
		if (playlist.flag_current) return ` (${i18next.t('FLAGS.CURRENT')})`;
		return '';
	}

	copyBlcSet = () => {
		this.togglePlaylistCommands();
		ReactDOM.render(<BlcSetCopyModal
			bLSetFrom={this.props.bLSet?.blc_set_id as number}
			bLSetList={this.props.bLSetList.filter(blcset => blcset.blc_set_id !== this.props.bLSet?.blc_set_id)}
		/>, document.getElementById('modal'));
	}

	togglePlaylistCommands = () => {
		this.state.playlistCommands ?
			document.getElementById('root').removeEventListener('click', this.handleClick) :
			document.getElementById('root').addEventListener('click', this.handleClick);
		this.setState({ playlistCommands: !this.state.playlistCommands });
		getTuto()?.move(1);
	};

	handleClick = (e: MouseEvent) => {
		if (!(e.target as Element).closest('.dropdown-menu')) {
			this.togglePlaylistCommands();
		}
	}

	openShuffleModal = () => {
		this.togglePlaylistCommands();
		ReactDOM.render(<ShuffleModal
			idPlaylist={this.props.idPlaylist}
			playlistWillUpdate={this.props.playlistWillUpdate}
			playlistDidUpdate={this.props.playlistDidUpdate}
		/>, document.getElementById('modal'));
	}

	render() {
		const plCommandsContainer = (
			this.props.scope === 'admin' && this.props.idPlaylist !== -4 ?
				<div className="actionDiv">
					<div className="btn-group">
						{this.props.idPlaylist !== -4 ?
							<React.Fragment>
								<button
									title={i18next.t('ADVANCED.SELECT_ALL')}
									onClick={() => {
										this.setState({ selectAllKarasChecked: !this.state.selectAllKarasChecked });
										this.props.selectAllKaras();
									}}
									className="btn btn-default karaLineButton"
								>
									{
										this.state.selectAllKarasChecked
											? <i className="far fa-check-square"></i>
											: <i className="far fa-square"></i>
									}
								</button>
								<ActionsButtons
									idPlaylistTo={this.props.idPlaylistTo}
									idPlaylist={this.props.idPlaylist}
									scope={this.props.scope}
									side={this.props.side}
									isHeader={true}
									addKara={this.props.addCheckedKaras}
									deleteKara={this.props.deleteCheckedKaras}
									transferKara={this.props.transferCheckedKaras}
									checkedkaras={this.props.checkedkaras} />
							</React.Fragment> : null
						}
					</div>
				</div> : null);

		const searchMenu = (this.props.tags && this.props.tags.filter(tag => tag.type.includes(this.state.tagType)).length > 0 ?
			<div className="searchMenuContainer">
				<div className="filterContainer">
					<div className='filterButton ' onClick={async () => {
						await this.setState({ activeFilterUUID: '' });
						this.props.getPlaylist();
					}}>
						<i className="fas fa-trash-alt"></i> <span>{i18next.t('CLEAR_FILTER')}</span>
					</div>
					<select className="filterElement filterTags" placeholder="Search"
						onChange={e => this.setState({ tagType: (Number(e.target.value) ? Number(e.target.value) : e.target.value) })}
						value={this.state.tagType}>
						{tagsTypesList.map(val => {
							if (val === 'DETAILS_YEAR') {
								return <option key={val} value={0}>{i18next.t(val)}</option>;
							} else {
								return <option key={val} value={val.replace('BLCTYPE_', '')}>{i18next.t(`BLACKLIST.${val}`)}</option>;
							}
						})}
					</select>
					<div className="filterElement filterTagsOptions">
						<Autocomplete value={this.state.activeFilterUUID || ''}
							options={this.props.tags.filter(tag => tag.type.includes(this.state.tagType))}
							onChange={this.onChangeTags} />
					</div>
				</div>
				<div className="filterContainer">
					<div className={'filterElement ' + (this.state.activeFilter === 1 ? 'filterElementActive' : '')} onClick={() => this.getKarasList(1, 'search')}>
						<i className="fas fa-sort-alpha-down"></i> {i18next.t('VIEW_STANDARD')}
					</div>
					<div className={'filterElement ' + (this.state.activeFilter === 2 ? 'filterElementActive' : '')} onClick={() => this.getKarasList(2)}>
						<i className="fas fa-star"></i> {i18next.t('VIEW_FAVORITES')}
					</div>
				</div>
				<div className="filterContainer">
					<div className={'filterElement ' + (this.state.activeFilter === 3 ? 'filterElementActive' : '')} onClick={() => this.getKarasList(3, 'recent')}>
						<i className="far fa-clock"></i> {i18next.t('VIEW_RECENT')}
					</div>
					<div className={'filterElement ' + (this.state.activeFilter === 4 ? 'filterElementActive' : '')} onClick={() => this.getKarasList(4, 'requested')}>
						<i className="fas fa-fire"></i> {i18next.t('VIEW_POPULAR')}
					</div>
				</div>
			</div> : null);
		return (
			<React.Fragment>
				{this.props.scope !== 'public' || this.props.side !== 1 ?
					<div className="panel-heading plDashboard">
						{this.props.scope === 'admin' || this.context?.globalState.settings.data.config?.Frontend.Mode !== 1 ?
							<React.Fragment>
								{this.props.scope === 'admin' ?
									<div
										className="dropdown"
									>
										<button title={i18next.t('ADVANCED.PLAYLIST_COMMANDS')} onClick={this.togglePlaylistCommands}
											className={'btn btn-default showPlaylistCommands karaLineButton' + (this.state.playlistCommands ? ' btn-primary' : '')}>
											<i className="fas fa-wrench"></i>
										</button>
										{this.state.playlistCommands ?
											<ul className="dropdown-menu">
												{this.props.idPlaylist === -4 && this.props.bLSetList.length > 1 ?
													<li>
														<a href="#" onClick={this.copyBlcSet} title={i18next.t('ADVANCED.SHUFFLE')}>
															<i className="fas fa-fw fa-copy" />
															{i18next.t('BLC.COPY')}
														</a>
													</li> : null
												}
												{this.props.idPlaylist >= 0 ?
													<li>
														<a href="#" onClick={this.openShuffleModal}>
															<i className="fas fa-fw fa-random" />
															{i18next.t('ADVANCED.SHUFFLE')}
														</a>
													</li> : null
												}
												{this.props.idPlaylistTo >= 0 && this.props.idPlaylist !== -4 ?
													<React.Fragment>
														<li>
															<a href="#" onClick={() => {
																this.togglePlaylistCommands();
																this.props.addAllKaras();
															}} className="danger-hover">
																<i className="fas fa-fw fa-share" />
																{i18next.t('ADVANCED.ADD_ALL')}
															</a>
														</li>
														{this.props.idPlaylist >= 0 || this.props.idPlaylist === -1 ?
															<li>
																<a href="#" onClick={() => {
																	this.togglePlaylistCommands();
																	this.props.addRandomKaras();
																}}>
																	<i className="fas fa-fw fa-dice" />
																	{i18next.t('ADVANCED.ADD_RANDOM')}
																</a>
															</li> : null
														}
													</React.Fragment>
													: null
												}
												{this.props.idPlaylist >= 0 || this.props.idPlaylist === -4 ?
													<li>
														<a href="#" onClick={this.deleteAllKaras} className="danger-hover">
															<i className="fas fa-fw fa-eraser" />
															{i18next.t('ADVANCED.EMPTY_LIST')}
														</a>
													</li> : null
												}
												{this.props.idPlaylist >= 0 ?
													<li>
														<a href="#" onClick={this.setFlagVisible}>
															{this.props.playlistInfo?.flag_visible ?
																<i className="fas fa-fw fa-eye-slash"></i> :
																<i className="fas fa-fw fa-eye"></i>
															}
															{i18next.t(this.props.playlistInfo?.flag_visible ?
																'ADVANCED.INVISIBLE' : 'ADVANCED.VISIBLE')}
														</a>
													</li> : null
												}
												{this.props.idPlaylist >= 0 && !this.props.playlistInfo?.flag_public ?
													<li>
														<a href="#" onClick={this.setFlagPublic}>
															<i className="fas fa-fw fa-globe" />
															{i18next.t('ADVANCED.PUBLIC')}
														</a>
													</li> : null
												}
												{(this.props.idPlaylist >= 0 && !this.props.playlistInfo?.flag_current)
													|| (this.props.idPlaylist === -4 && !this.props.bLSet?.flag_current) ?
													<li>
														<a href="#" onClick={this.setFlagCurrent}>
															<i className="fas fa-fw fa-play-circle" />
															{i18next.t(this.props.idPlaylist === -4 ? 'BLC.CURRENT' : 'ADVANCED.CURRENT')}
														</a>
													</li> : null
												}
												{this.props.idPlaylist >= 0 || this.props.idPlaylist === -4 ?
													<React.Fragment>
														<li>
															<a href="#" onClick={this.deletePlaylist} className="danger-hover">
																<i className="fas fa-fw fa-trash" />
																{i18next.t(this.props.idPlaylist === -4 ? 'BLC.DELETE' : 'ADVANCED.DELETE')}
															</a>
														</li>
														<li>
															<a href="#" onClick={() => {
																this.togglePlaylistCommands();
																this.props.editNamePlaylist();
															}}>
																<i className="fas fa-fw fa-pencil-alt" />
																{i18next.t(this.props.idPlaylist === -4 ? 'BLC.EDIT' : 'ADVANCED.RENAME')}
															</a>
														</li>
													</React.Fragment> : null
												}
												{
													this.props.idPlaylist !== -1 ?
														<li>
															<a href="#" onClick={this.exportPlaylist}>
																<i className="fas fa-fw fa-upload" />
																{i18next.t(this.props.idPlaylist === -4 ? 'BLC.EXPORT' :
																	(this.props.idPlaylist === -5 ? 'FAVORITES_EXPORT' : 'ADVANCED.EXPORT'))}
															</a>
														</li> : ''
												}
												<hr />
												<li>
													<a href="#" onClick={this.addPlaylist}>
														<i className="fas fa-fw fa-plus" />
														{i18next.t(this.props.idPlaylist === -4 ? 'BLC.ADD' : 'ADVANCED.ADD')}
													</a>
												</li>
												{this.props.idPlaylist !== -4 ?
													<li>
														<a href="#" onClick={this.startFavMix}>
															<i className="fas fa-fw fa-bolt" />
															{i18next.t('ADVANCED.AUTOMIX')}
														</a>
													</li> : null
												}
												<li>
													<a href="#" >
														<label className="importFile" htmlFor={'import-file' + this.props.side}>
															<i className="fas fa-fw fa-download" />
															{i18next.t(this.props.idPlaylist === -4 ? 'BLC.IMPORT' :
																(this.props.idPlaylist === -5 ? 'FAVORITES_IMPORT' : 'ADVANCED.IMPORT'))}
														</label>
													</a>
													<input id={'import-file' + this.props.side} className="import-file" type="file" style={{ display: 'none' }}
														accept=".kmplaylist, .kmfavorites, .kmblc" onChange={this.importPlaylist} />
												</li>
											</ul> : null
										}
									</div> : null
								}
								{is_touch_device() ?
									<select
										value={this.props.idPlaylist} onChange={(e) => this.props.changeIdPlaylist(Number(e.target.value))}>
										{(this.props.scope === 'public' && this.props.side === 1 && this.context?.globalState.settings.data.config?.Frontend.Mode === 1) ?
											<option value={this.context.globalState.settings.data.state.currentPlaylistID}>
												{this.props.playlistList.filter(pl => pl.playlist_id === this.context.globalState.settings.data.state.currentPlaylistID)[0].name}
											</option> :
											this.props.scope === 'public' && this.props.side === 1 ? (
												<React.Fragment>
													<option value={-1}>{i18next.t('PLAYLIST_KARAS')}</option>
													<option value={-5}>{i18next.t('PLAYLIST_FAVORITES')}</option>
												</React.Fragment>) :
												(<React.Fragment>
													{this.props.playlistList?.map(playlist => {
														return <option key={playlist.playlist_id} value={playlist.playlist_id}>
															{playlist.name}{this.getFlagLabel(playlist)}
														</option>;
													})}
												</React.Fragment>)
										}
									</select> :
									<SelectWithIcon list={this.getListToSelect()} value={this.props.idPlaylist?.toString()}
										onChange={(value: any) => this.props.changeIdPlaylist(Number(value))} />
								}
								{this.props.scope === 'admin' && this.props.idPlaylist === -4 ?
									<select
										value={this.props.bLSet?.blc_set_id}
										onChange={(e) => this.props.changeIdPlaylist(this.props.idPlaylist, Number(e.target.value))}>
										{this.props.bLSetList.map(set => {
											return <option key={set.blc_set_id} value={set.blc_set_id}>{set.name}</option>;
										})}
									</select> : null
								}
							</React.Fragment> : null
						}
						{this.props.scope === 'admin' && this.props.idPlaylist === -1 ?
							<div className="searchMenuButtonContainer btn-group">
								<button type="button" title={i18next.t('FILTERS')}
									className={'searchMenuButton collapsed btn btn-default karaLineButton'
										+ (this.props.searchMenuOpen ? ' searchMenuButtonOpen' : '')}
									onClick={this.props.toggleSearchMenu}>
									<i className="fas fa-filter"></i>
								</button>
							</div> : null
						}
						<div className="plSearch">
							<input
								type="text"
								placeholder={`\uF002 ${i18next.t('SEARCH')}`}
								defaultValue={this.props.side === 1 ?
									this.context.globalState.frontendContext.filterValue1 :
									this.context.globalState.frontendContext.filterValue2}
								onChange={e => setFilterValue(
									this.context.globalDispatch,
									e.target.value,
									this.props.side,
									this.props.idPlaylist
								)}
							/>
						</div>
						{plCommandsContainer}
					</div> : null
				}
				{this.props.searchMenuOpen ?
					searchMenu : null
				}
			</React.Fragment >
		);
	}
}


export default PlaylistHeader;