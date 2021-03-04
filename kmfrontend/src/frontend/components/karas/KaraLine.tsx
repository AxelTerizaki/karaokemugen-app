import './KaraLine.scss';

import i18next from 'i18next';
import React, { Component, CSSProperties, Key, MouseEvent } from 'react';
import { SortableElement, SortableElementProps, SortableHandle } from 'react-sortable-hoc';

import { DBKaraTag } from '../../../../../src/lib/types/database/kara';
import { Tag } from '../../../../../src/lib/types/tag';
import { DBBlacklist } from '../../../../../src/types/database/blacklist';
import { DBPL } from '../../../../../src/types/database/playlist';
import { closeModal, showModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import {buildKaraTitle, getSerieLanguage, getTagInLocale, sortTagByPriority} from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import { displayMessage, is_touch_device, secondsTimeSpanToHMS } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import KaraMenuModal from '../modals/KaraMenuModal';
import ActionsButtons from './ActionsButtons';

const DragHandle = SortableHandle(() => <span className="dragHandle"><i className="fas fa-ellipsis-v" /></span>);

interface IProps {
	kara: KaraElement;
	side: number;
	idPlaylist: number;
	idPlaylistTo: number;
	playlistInfo: DBPL | undefined;
	scope: string;
	i18nTag: { [key: string]: { [key: string]: string } };
	avatar_file: string;
	indexInPL: number;
	checkKara: (id: number | string) => void;
	deleteCriteria: (kara: DBBlacklist) => void;
	jingle: boolean;
	sponsor: boolean;
	style: CSSProperties;
	key: Key;
	toggleKaraDetail: (kara: KaraElement, idPlaylist: number) => void;
}

interface IState {
	karaMenu: boolean;
	problematic: boolean
}

class KaraLine extends Component<IProps & SortableElementProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps & SortableElementProps) {
		super(props);
		this.state = {
			karaMenu: false,
			problematic: this.isProblematic()
		};
	}

	upvoteKara = () => {
		const plc_id = this.props.kara.playlistcontent_id ? this.props.kara.playlistcontent_id : this.props.kara.public_plc_id[0];
		const data = this.props.kara.flag_upvoted ? { downvote: 'true', plc_id: plc_id } : { plc_id: plc_id };
		commandBackend('votePLC', data);
	};


	refuseKara = () => {
		commandBackend('editPLC', {
			flag_refused: !this.props.kara.flag_refused,
			plc_ids: [this.props.kara.playlistcontent_id]
		});
	};

	acceptKara = () => {
		commandBackend('editPLC', {
			flag_accepted: !this.props.kara.flag_accepted,
			plc_ids: [this.props.kara.playlistcontent_id]
		});
	};

	deleteKara = async () => {
		if (this.props.idPlaylist === -1 || this.props.idPlaylist === -5) {
			await commandBackend('deleteKaraFromPlaylist', {
				plc_ids: this.props.kara.my_public_plc_id
			});
		} else if (this.props.idPlaylist === -2) {
			this.props.deleteCriteria(this.props.kara as unknown as DBBlacklist);
		} else if (this.props.idPlaylist === -3) {
			await commandBackend('deleteKaraFromWhitelist', {
				kids: [this.props.kara.kid]
			});
		} else {
			await commandBackend('deleteKaraFromPlaylist', {
				plc_ids: [this.props.kara.playlistcontent_id]
			});
		}
	};

	deleteFavorite = () => {
		commandBackend('deleteFavorites', {
			kids: [this.props.kara.kid]
		});
	}

	playKara = () => {
		if (this.props.idPlaylist < 0) {
			commandBackend('playKara', {
				kid: this.props.kara.kid
			});
		} else {
			commandBackend('editPLC', {
				flag_playing: true,
				plc_ids: [this.props.kara.playlistcontent_id]
			});
		}
	};

	addKara = async (_event?: any, pos?: number) => {
		let url = '';
		let data;
		if (this.props.idPlaylistTo === -5) {
			url = 'addFavorites';
			data = {
				kids: [this.props.kara.kid]
			};
		} else if (this.props.scope === 'admin') {
			if (this.props.idPlaylistTo > 0) {
				if (this.props.idPlaylist > 0 && !pos) {
					url = 'copyKaraToPlaylist';
					data = {
						pl_id: this.props.idPlaylistTo,
						plc_ids: [this.props.kara.playlistcontent_id]
					};
				} else {
					url = 'addKaraToPlaylist';
					if (pos) {
						data = {
							pl_id: this.props.idPlaylistTo,
							requestedby: this.context.globalState.auth.data.username,
							kids: [this.props.kara.kid],
							pos: pos
						};
					} else {
						data = {
							pl_id: this.props.idPlaylistTo,
							requestedby: this.context.globalState.auth.data.username,
							kids: [this.props.kara.kid]
						};
					}
				}
			} else if (this.props.idPlaylistTo === -2 || this.props.idPlaylistTo === -4) {
				url = 'createBLC';
				data = {
					blcs: [{ type: 1001, value: this.props.kara.kid }],
					set_id: this.context.globalState.frontendContext.currentBlSet
				};
			} else if (this.props.idPlaylistTo === -3) {
				url = 'addKaraToWhitelist';
				data = {
					kids: [this.props.kara.kid]
				};
			}
		} else {
			url = 'addKaraToPublicPlaylist';
			data = {
				requestedby: this.context.globalState.auth.data.username,
				kid: this.props.kara.kid
			};
		}
		const response = await commandBackend(url, data);
		if (response && response.code && response.data?.plc && response.data?.plc.time_before_play) {
			const playTime = new Date(Date.now() + response.data.plc.time_before_play * 1000);
			const playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
			const beforePlayTime = secondsTimeSpanToHMS(response.data.plc.time_before_play, 'hm');
			displayMessage('success', <div>
				{i18next.t(`SUCCESS_CODES.${response.code}`)}
				<br />
				{i18next.t('TIME_BEFORE_PLAY', {
					time: beforePlayTime,
					date: playTimeDate
				})}
			</div>);
		}
	};

	transferKara = async (event: any, pos?: number) => {
		await this.addKara(event, pos);
		this.deleteKara();
	};

	checkKara = () => {
		if (this.props.idPlaylist >= 0) {
			this.props.checkKara(this.props.kara.playlistcontent_id);
		} else {
			this.props.checkKara(this.props.kara.kid);
		}
	};

	changeVisibilityKara = () => {
		commandBackend('editPLC', {
			flag_visible: true,
			plc_ids: [this.props.kara.playlistcontent_id]
		});
	};

	compareTag = (a: DBKaraTag, b: DBKaraTag) => {
		return a.name.localeCompare(b.name);
	}

	karaTags = (() => {
		// Tags in the header
		const karaTags: JSX.Element[] = [];
		const data = this.props.kara;

		if (data.langs && (this.props.scope === 'public' || is_touch_device())) {
			const isMulti = data.langs.find(e => e.name.indexOf('mul') > -1);
			isMulti ? karaTags.push(<div key={isMulti.tid} className="tag">
				{getTagInLocale(isMulti)}
			</div>) : karaTags.push(...data.langs.sort(this.compareTag).map((tag, i) => {
				if (i === 0) return undefined;
				return <div key={tag.tid} className="tag green" title={getTagInLocale(tag, this.props.i18nTag)}>
					{getTagInLocale(tag, this.props.i18nTag)}
				</div>;
			}));
		}
		if (data.songtypes && (this.props.scope === 'public' || is_touch_device())) {
			karaTags.push(...data.songtypes.sort(this.compareTag).map((tag, i) => {
				if (i === 0) return undefined;
				return <div key={tag.tid} className="tag green" title={getTagInLocale(tag, this.props.i18nTag)}>
					{getTagInLocale(tag, this.props.i18nTag)}
					{data.songorder > 0 ? ' ' + data.songorder : ''}
				</div>;
			}));
		}
		for (const type of ['FAMILIES', 'PLATFORMS', 'ORIGINS', 'MISC']) {
			const typeData = tagTypes[type];
			if (data[typeData.karajson]) {
				karaTags.push(...data[typeData.karajson].sort(this.compareTag).map(tag => {
					return <div key={tag.tid} className={`tag ${typeData.color}${tag.problematic ? ' problematicTag':''}`} title={getTagInLocale(tag, this.props.i18nTag)}>
						{this.props.scope === 'admin' && !is_touch_device() ? (tag.short ? tag.short : tag.name) : getTagInLocale(tag, this.props.i18nTag)}
					</div>;
				}));
			}
		}
		return karaTags.filter(el => !!el);
	})();

	isProblematic = () => {
		let problematic = false;
		for (const tagType of Object.keys(tagTypes)) {
			if ((this.props.kara[tagType.toLowerCase()] as unknown as Tag[])?.length > 0
				&& this.props.kara[tagType.toLowerCase()].some((t: Tag) => t.problematic)) {
				problematic = true;
			}
		}
		return problematic;
	}

	getSerieOrSingers = (data: KaraElement) => {
		return (data.series && data.series.length > 0) ? data.series.map(e => getSerieLanguage(this.context.globalState.settings.data, e, data.langs[0].name, this.props.i18nTag)).join(', ')
			: data.singers.map(e => getTagInLocale(e, this.props.i18nTag)).join(', ');
	}

	openKaraMenu = (event: MouseEvent) => {
		if (event?.currentTarget) {
			const element = (event.currentTarget as Element).getBoundingClientRect();
			showModal(this.context.globalDispatch, <KaraMenuModal
				kara={this.props.kara}
				side={this.props.side}
				idPlaylist={this.props.idPlaylist}
				idPlaylistTo={this.props.idPlaylistTo}
				publicOuCurrent={this.props.playlistInfo && (this.props.playlistInfo.flag_current || this.props.playlistInfo.flag_public)}
				topKaraMenu={element.bottom}
				leftKaraMenu={element.left}
				transferKara={this.transferKara}
				closeKaraMenu={this.closeKaraMenu}
			/>);
			this.setState({ karaMenu: true });
		}
	}

	closeKaraMenu = () => {
		closeModal(this.context.globalDispatch);
		this.setState({ karaMenu: false });
	}

	render() {
		const karaTitle = buildKaraTitle(this.context.globalState.settings.data, this.props.kara, false, this.props.i18nTag);
		const karaSerieOrSingers = this.getSerieOrSingers(this.props.kara);
		const kara = this.props.kara;
		const scope = this.props.scope;
		const idPlaylist = this.props.idPlaylist;
		const shouldShowProfile = this.context.globalState.settings.data.config.Frontend.ShowAvatarsOnPlaylist
			&& this.props.avatar_file;
		return (
			<div key={this.props.key} style={this.props.style}>
				<div className={`list-group-item${kara.flag_playing ? ' currentlyplaying' : ''}${kara.flag_dejavu ? ' dejavu' : ''}
				${this.props.indexInPL % 2 === 0 ? ' list-group-item-even' : ''} ${(this.props.jingle || this.props.sponsor) && scope === 'admin' ? ' marker' : ''}
				${this.props.sponsor && scope === 'admin' ? ' green' : ''}${this.props.side === 2 ? ' side-2' : ''}`}>
					{scope === 'public' && kara.username !== this.context.globalState.auth.data.username && kara.flag_visible === false ?
						<div className="contentDiv">
							<div>
								{
									(this.context.globalState.settings.data.config.Playlist.MysterySongs.Labels as string[])[(this.context.globalState.settings.data.config.Playlist.MysterySongs.Labels as string[]).length * Math.random() | 0]
								}
							</div>
						</div> :
						<React.Fragment>
							<div className="actionDiv">
								{!is_touch_device() && shouldShowProfile ?
									<ProfilePicture className={`img-circle${is_touch_device() ? ' mobile' : ''}`}
										alt="User Pic" user={{ login: this.props.kara.username, avatar_file: this.props.avatar_file,
											nickname: this.props.kara.nickname, type: this.props.kara.user_type }} /> : null
								}
								<div className="btn-group">
									{this.props.scope === 'admin' || this.context?.globalState.settings.data.config?.Frontend.Mode === 2 ?
										<ActionsButtons
											idPlaylistTo={this.props.idPlaylistTo}
											idPlaylist={idPlaylist}
											scope={this.props.scope}
											side={this.props.side}
											kara={kara}
											addKara={this.addKara}
											deleteKara={this.deleteKara}
											deleteFavorite={this.deleteFavorite}
											upvoteKara={this.upvoteKara}
											refuseKara={this.refuseKara}
											acceptKara={this.acceptKara}
											flag_public={this.props.playlistInfo?.flag_public}
										/> : null
									}
									{scope === 'admin' ?
										<button title={i18next.t('KARA_MENU.KARA_COMMANDS')}
											onClick={(event) => {
												this.state.karaMenu ? this.closeKaraMenu() : this.openKaraMenu(event);
											}}
											className={'btn btn-sm showPlaylistCommands karaLineButton' + (this.state.karaMenu ? ' btn-primary' : '')}>
											<i className="fas fa-wrench" />
										</button> : null
									}
								</div>
								{!is_touch_device() && scope === 'admin' && idPlaylist > 0 ? <DragHandle /> : null}
							</div>
							{scope === 'admin' && idPlaylist !== -2 && idPlaylist !== -4 ?
								<span className="checkboxKara" onClick={this.checkKara}>
									{kara.checked ? <i className="far fa-check-square"></i>
										: <i className="far fa-square"></i>}
								</span> : null}
							{is_touch_device() || this.props.scope === 'public' ?
								<div className="contentDiv contentDivMobile" onClick={() => this.props.toggleKaraDetail(kara, idPlaylist)} tabIndex={1}>
									<div className="contentDivMobileTitle">
										<span className="tag inline green" title={getTagInLocale(kara.langs[0], this.props.i18nTag)}>
											{kara.langs[0].short?.toUpperCase() || kara.langs[0].name.toUpperCase()}
										</span>
										{kara.title}
										{kara.versions?.sort(sortTagByPriority).map(t => <span className="tag inline white" key={t.tid}>{getTagInLocale(t, this.props.i18nTag)}</span>)}
										{this.state.problematic ? <i className="fas fa-fw fa-exclamation-triangle problematic" />:null}
										{kara.flag_dejavu && !kara.flag_playing ? <i className="fas fa-fw fa-history dejavu-icon" />:null}
									</div>
									<div className="contentDivMobileSerie">
										<span className="tag inline green" title={getTagInLocale(kara.songtypes[0], this.props.i18nTag)}>
											{kara.songtypes[0].short?.toUpperCase() || kara.songtypes[0].name}
										</span>
										{karaSerieOrSingers}
									</div>
									{kara.upvotes && this.props.scope === 'admin' ?
										<div className="upvoteCount"
											title={i18next.t('TOOLTIP_FREE')}>
											<i className="fas fa-thumbs-up" />
											{kara.upvotes}
										</div> : null
									}
									{!is_touch_device() ? <div className="tagConteneur">
										{this.karaTags}
									</div> : null}
								</div> :
								<div className="contentDiv" onClick={() => this.props.toggleKaraDetail(kara, idPlaylist)} tabIndex={1}>
									<div className="disable-select karaTitle">
										{karaTitle}
										{this.state.problematic ? <i className="fas fa-fw fa-exclamation-triangle problematic" />:null}
										{kara.flag_dejavu && !kara.flag_playing ? <i className="fas fa-fw fa-history dejavu-icon" />:null}
										{kara.upvotes && this.props.scope === 'admin' ?
											<div className="upvoteCount"
												title={i18next.t('UPVOTE_NUMBER')}>
												<i className="fas fa-thumbs-up" />
												{kara.upvotes}
											</div> : null
										}
										<div className="tagConteneur">
											{this.karaTags}
										</div>
									</div>
								</div>
							}
							<div className="infoDiv">
								{scope === 'admin' ?
									<button title={i18next.t(idPlaylist < 0 ? 'KARA_MENU.PLAY_LIBRARY' : 'KARA_MENU.PLAY')}
										className="btn btn-sm btn-action playKara karaLineButton" onClick={this.playKara}>
										<i className={`fas ${idPlaylist < 0 ? 'fa-play' : 'fa-play-circle'}`}></i>
									</button> : null}
								{scope === 'admin' && idPlaylist > 0 && !kara.flag_visible ?
									<button type="button" className={'btn btn-sm btn-action btn-primary'} onClick={this.changeVisibilityKara}>
										<i className="fas fa-eye-slash"></i>
									</button> : null
								}
							</div>
							{is_touch_device() ?
								<div className="tagConteneur mobile">
									{this.karaTags}
									{!(is_touch_device() && scope === 'admin') && shouldShowProfile ?
										<div className="img-container">
											<ProfilePicture className={`img-circle${is_touch_device() ? ' mobile' : ''}`}
												alt="User Pic" user={{ login: this.props.kara.username,
													avatar_file: this.props.avatar_file,
													nickname: this.props.kara.username }} />
										</div> : null}
								</div> : null
							}
						</React.Fragment>
					}
				</div>
				{(this.props.sponsor && this.props.jingle && scope === 'admin') ? <div className="marker-label green">
					{i18next.t('JINGLE_SPONSOR')}
				</div> : this.props.jingle && scope === 'admin' ? <div className="marker-label">
					{i18next.t('JINGLE')}
				</div> : this.props.sponsor && scope === 'admin' ? <div className="marker-label green">
					{i18next.t('SPONSOR')}
				</div> : ''}
			</div>
		);
	}
}

export default SortableElement(KaraLine, { withRef: true });
