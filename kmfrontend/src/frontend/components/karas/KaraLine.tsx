import './KaraLine.scss';

import i18next from 'i18next';
import React, { Component, CSSProperties, Key, MouseEvent } from 'react';
import { SortableElement, SortableElementProps, SortableHandle } from 'react-sortable-hoc';
import { toast } from 'react-toastify';

import { DBKaraTag } from '../../../../../src/lib/types/database/kara';
import { DBPL } from '../../../../../src/lib/types/database/playlist';
import { DBBlacklist } from '../../../../../src/types/database/blacklist';
import nanamiSingPng from '../../../assets/nanami-sing.png';
import nanamiSingWebP from '../../../assets/nanami-sing.webp';
import { closeModal, showModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import { buildKaraTitle, getSerieLanguage, getTagInLocale, sortTagByPriority } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import {
	displayMessage,
	is_touch_device,
	isNonStandardPlaylist,
	nonStandardPlaylists,
	secondsTimeSpanToHMS
} from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import KaraMenuModal from '../modals/KaraMenuModal';
import ActionsButtons from './ActionsButtons';

const DragHandle = SortableHandle(() => <span className="dragHandle"><i className="fas fa-ellipsis-v" /></span>);

interface IProps {
	kara: KaraElement;
	side: number;
	plaid: string;
	plaidTo: string;
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
	toggleKaraDetail: (kara: KaraElement, plaid: string) => void;
	sortable: boolean;
}

interface IState {
	karaMenu: boolean;
	problematic: DBKaraTag[]
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
		const plc_id = this.props.kara.plcid ? this.props.kara.plcid : this.props.kara.public_plc_id[0];
		const data = this.props.kara.flag_upvoted ? { downvote: 'true', plc_id: plc_id } : { plc_id: plc_id };
		commandBackend('votePLC', data).catch(() => { });
	};


	refuseKara = () => {
		commandBackend('editPLC', {
			flag_refused: !this.props.kara.flag_refused,
			plc_ids: [this.props.kara.plcid]
		}).catch(() => { });
	};

	acceptKara = () => {
		commandBackend('editPLC', {
			flag_accepted: !this.props.kara.flag_accepted,
			plc_ids: [this.props.kara.plcid]
		}).catch(() => { });
	};

	deleteKara = async () => {
		if (this.props.plaid === nonStandardPlaylists.library || this.props.plaid === nonStandardPlaylists.favorites) {
			await commandBackend('deleteKaraFromPlaylist', {
				plc_ids: this.props.kara?.plcid ? [this.props.kara.plcid] : this.props.kara.my_public_plc_id
			}).catch(() => { });
		} else if (this.props.plaid === nonStandardPlaylists.blacklist) {
			this.props.deleteCriteria(this.props.kara as unknown as DBBlacklist);
		} else if (this.props.plaid === nonStandardPlaylists.whitelist) {
			await commandBackend('deleteKaraFromWhitelist', {
				kids: [this.props.kara.kid]
			}).catch(() => { });
		} else {
			await commandBackend('deleteKaraFromPlaylist', {
				plc_ids: [this.props.kara.plcid]
			}).catch(() => { });
		}
	};

	deleteFavorite = () => {
		if (this.context.globalState.auth.data.onlineAvailable !== false) {
			commandBackend('deleteFavorites', {
				kids: [this.props.kara.kid]
			}).catch(() => { });
		} else {
			displayMessage('warning', i18next.t('ERROR_CODES.FAVORITES_ONLINE_NOINTERNET'), 5000);
			return;
		}
	}

	playKara = () => {
		commandBackend('playKara', {
			kid: this.props.kara.kid
		}).catch(() => { });
	};

	editPlayingFlag = () => {
		commandBackend('editPLC', {
			flag_playing: true,
			plc_ids: [this.props.kara.plcid]
		}).catch(() => { });
	};

	addKara = async (_event?: any, pos?: number) => {
		let url = '';
		let data;
		if (this.props.plaidTo === nonStandardPlaylists.favorites) {
			if (this.context.globalState.auth.data.onlineAvailable !== false) {
				url = 'addFavorites';
				data = {
					kids: [this.props.kara.kid]
				};
			} else {
				displayMessage('warning', i18next.t('ERROR_CODES.FAVORITES_ONLINE_NOINTERNET'), 5000);
				return;
			}
		} else if (this.props.scope === 'admin') {
			if (!isNonStandardPlaylist(this.props.plaidTo)) {
				if (!isNonStandardPlaylist(this.props.plaid) && !pos) {
					url = 'copyKaraToPlaylist';
					data = {
						plaid: this.props.plaidTo,
						plc_ids: [this.props.kara.plcid]
					};
				} else {
					url = 'addKaraToPlaylist';
					if (pos) {
						data = {
							plaid: this.props.plaidTo,
							requestedby: this.context.globalState.auth.data.username,
							kids: [this.props.kara.kid],
							pos: pos
						};
					} else {
						data = {
							plaid: this.props.plaidTo,
							requestedby: this.context.globalState.auth.data.username,
							kids: [this.props.kara.kid]
						};
					}
				}
			} else if (this.props.plaidTo === nonStandardPlaylists.blacklist || this.props.plaidTo === nonStandardPlaylists.blc) {
				url = 'createBLC';
				data = {
					blcs: [{ type: 1001, value: this.props.kara.kid }],
					set_id: this.context.globalState.frontendContext.currentBlSet
				};
			} else if (this.props.plaidTo === nonStandardPlaylists.whitelist) {
				url = 'addKaraToWhitelist';
				data = {
					kids: [this.props.kara.kid]
				};
			}
		} else {
			url = 'addKaraToPublicPlaylist';
			data = {
				requestedby: this.context.globalState.auth.data.username,
				kids: [this.props.kara.kid]
			};
		}
		const response = await commandBackend(url, data).catch(() => { });
		if (response && response.code && response.data?.plc) {
			let message;
			if (response.data?.plc.time_before_play) {
				const playTime = new Date(Date.now() + response.data.plc.time_before_play * 1000);
				const playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
				const beforePlayTime = secondsTimeSpanToHMS(response.data.plc.time_before_play, 'hm');
				message = (<>
					{i18next.t(`SUCCESS_CODES.${response.code}`, { song: this.props.kara.title })}
					<br />
					{i18next.t('TIME_BEFORE_PLAY', {
						time: beforePlayTime,
						date: playTimeDate
					})}
				</>);
			} else {
				message = (<>
					{i18next.t(`SUCCESS_CODES.${response.code}`, { song: this.props.kara.title })}
				</>);
			}
			displayMessage('success', <div className="toast-with-img">
				<picture>
					<source type="image/webp" srcSet={nanamiSingWebP} />
					<source type="image/png" srcSet={nanamiSingPng} />
					<img src={nanamiSingPng} alt="Nanami is singing!" />
				</picture>
				<span>
					{message}
					<br />
					<button className="btn" onClick={e => {
						e.preventDefault();
						e.stopPropagation();
						commandBackend('deleteKaraFromPlaylist', { plc_ids: [response.data.plc.plcid] })
							.then(() => {
								toast.dismiss(response.data.plc.plcid);
								displayMessage('success', i18next.t('SUCCESS_CODES.KARA_DELETED'));
							}).catch(() => {
								toast.dismiss(response.data.plc.plcid);
							});
					}}>{i18next.t('CANCEL')}</button>
				</span>
			</div>, 10000, 'top-left', response.data.plc.plcid);
		}
	};

	transferKara = async (event: any, pos?: number) => {
		await this.addKara(event, pos);
		this.deleteKara();
	};

	checkKara = () => {
		if (!isNonStandardPlaylist(this.props.plaid)) {
			this.props.checkKara(this.props.kara.plcid);
		} else {
			this.props.checkKara(this.props.kara.kid);
		}
	};

	changeVisibilityKara = () => {
		commandBackend('editPLC', {
			flag_visible: true,
			plc_ids: [this.props.kara.plcid]
		}).catch(() => { });
	};

	karaTags = (() => {
		// Tags in the header
		const karaTags: JSX.Element[] = [];
		const data = this.props.kara;

		if (data.langs && (this.props.scope === 'public' || is_touch_device())) {
			const isMulti = data.langs.find(e => e.name.indexOf('mul') > -1);
			isMulti ? karaTags.push(<div key={isMulti.tid} className="tag">
				{getTagInLocale(isMulti)}
			</div>) : karaTags.push(...data.langs.sort(sortTagByPriority).map((tag, i) => {
				if (i === 0) return undefined;
				return <div key={tag.tid} className="tag green" title={getTagInLocale(tag, this.props.i18nTag)}>
					{getTagInLocale(tag, this.props.i18nTag)}
				</div>;
			}));
		}
		if (data.songtypes && (this.props.scope === 'public' || is_touch_device())) {
			karaTags.push(...data.songtypes.sort(sortTagByPriority).map((tag, i) => {
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
				karaTags.push(...data[typeData.karajson].sort(sortTagByPriority).map(tag => {
					return <div key={tag.tid} className={`tag ${typeData.color}${tag.problematic ? ' problematicTag' : ''}`} title={getTagInLocale(tag, this.props.i18nTag)}>
						{this.props.scope === 'admin' && !is_touch_device() ? (tag.short ? tag.short : tag.name) : getTagInLocale(tag, this.props.i18nTag)}
					</div>;
				}));
			}
		}
		return karaTags.filter(el => !!el);
	})();

	isProblematic = () => {
		const problematic: DBKaraTag[] = [];
		for (const tagType of Object.keys(tagTypes)) {
			if ((this.props.kara[tagType.toLowerCase()] as unknown as DBKaraTag[])?.length > 0) {
				problematic.push(...this.props.kara[tagType.toLowerCase()].filter((t: DBKaraTag) => t.problematic));
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
				plaid={this.props.plaid}
				plaidTo={this.props.plaidTo}
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

	downloadIcon = (() => {
		// Tags in the header
		const data = this.props.kara;

		if (data.download_status === 'MISSING' && this.props.scope === 'admin') {
			return <i className="fas fa-fw fa-cloud" title={i18next.t('KARA.MISSING_DOWNLOAD_TOOLTIP')} />;
		} else if (data.download_status === 'DOWNLOADING' && this.props.scope === 'admin') {
			return <i className="fas fa-fw fa-cloud-download-alt" title={i18next.t('KARA.IN_PROGRESS_DOWNLOAD_TOOLTIP')} />;
		}
		return null;
	})();

	render() {
		const karaTitle = buildKaraTitle(this.context.globalState.settings.data, this.props.kara, false, this.props.i18nTag);
		const karaSerieOrSingers = this.getSerieOrSingers(this.props.kara);
		const kara = this.props.kara;
		const scope = this.props.scope;
		const plaid = this.props.plaid;
		const shouldShowProfile = this.context.globalState.settings.data.config.Frontend?.ShowAvatarsOnPlaylist
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
									(this.context.globalState.settings.data.config.Playlist.MysterySongs.Labels as string[])[this.props.kara.pos % (this.context.globalState.settings.data.config.Playlist.MysterySongs.Labels as string[]).length | 0]
								}
							</div>
						</div> :
						<React.Fragment>
							<div className="actionDiv">
								{!is_touch_device() && shouldShowProfile ?
									<ProfilePicture className={`img-circle${is_touch_device() ? ' mobile' : ''}`}
										alt="User Pic" user={{
											login: this.props.kara.username, avatar_file: this.props.avatar_file,
											nickname: this.props.kara.nickname, type: this.props.kara.user_type
										}} /> : null
								}
								<div className="btn-group">
									{this.props.scope === 'admin' || this.context?.globalState.settings.data?.config?.Frontend?.Mode === 2 ?
										<ActionsButtons
											plaidTo={this.props.plaidTo}
											plaid={plaid}
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
								{!is_touch_device() && scope === 'admin' && !isNonStandardPlaylist(plaid) && this.props.sortable ? <DragHandle /> : null}
							</div>
							{scope === 'admin' && plaid !== nonStandardPlaylists.blc ?
								<span className="checkboxKara" onClick={this.checkKara}>
									{kara.checked ? <i className="far fa-check-square"></i>
										: <i className="far fa-square"></i>}
								</span> : null}
							{is_touch_device() || this.props.scope === 'public' ?
								<div className="contentDiv contentDivMobile" onClick={() => this.props.toggleKaraDetail(kara, plaid)} tabIndex={1}>
									<div className="contentDivMobileTitle">
										<span className="tag inline green" title={getTagInLocale(kara.langs[0], this.props.i18nTag)}>
											{kara.langs[0].short?.toUpperCase() || kara.langs[0].name.toUpperCase()}
										</span>
										{kara.flag_dejavu && !kara.flag_playing ? <i className="fas fa-fw fa-history dejavu-icon"
											title={i18next.t('KARA.DEJAVU_TOOLTIP')} /> : null}
										{kara.title}
										{this.downloadIcon}
										{this.state.problematic.length > 0 ? <i className="fas fa-fw fa-exclamation-triangle problematic"
											title={i18next.t('KARA.PROBLEMATIC_TOOLTIP',
												{ tags: this.state.problematic.map(t => getTagInLocale(t, this.props.i18nTag)).join(', ') })} /> : null}
									</div>
									<div className="contentDivMobileSerie">
										<span className="tag inline green" title={getTagInLocale(kara.songtypes[0], this.props.i18nTag)}>
											{kara.songtypes[0].short?.toUpperCase() || kara.songtypes[0].name} {kara.songorder}
										</span>
										{karaSerieOrSingers}
									</div>
									{kara.upvotes && this.props.scope === 'admin' ?
										<div className="upvoteCount">
											<i className="fas fa-thumbs-up" />
											{kara.upvotes}
										</div> : null
									}
									{!is_touch_device() ? <div className="tagConteneur">
										{this.karaTags}
										{kara.versions?.sort(sortTagByPriority).map(t =>
											<span className="tag white" key={t.tid}>{getTagInLocale(t, this.props.i18nTag)}</span>
										)}
									</div> : null}
								</div> :
								<div className="contentDiv" onClick={() => this.props.toggleKaraDetail(kara, plaid)} tabIndex={1}>
									<div className="disable-select karaTitle">
										{kara.flag_dejavu && !kara.flag_playing ? <i className="fas fa-fw fa-history dejavu-icon"
											title={i18next.t('KARA.DEJAVU_TOOLTIP')} /> : null}
										{karaTitle}
										{this.downloadIcon}
										{this.state.problematic.length > 0 ? <i className="fas fa-fw fa-exclamation-triangle problematic"
											title={i18next.t('KARA.PROBLEMATIC_TOOLTIP',
												{ tags: this.state.problematic.map(t => getTagInLocale(t, this.props.i18nTag)).join(', ') })} /> : null}
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
								{scope === 'admin' && (isNonStandardPlaylist(plaid)
									|| (this.props.playlistInfo?.flag_public && !this.props.playlistInfo?.flag_current)) ?
									<button
										title={i18next.t('KARA_MENU.PLAY_LIBRARY')}
										className="btn btn-sm btn-action playKara karaLineButton" onClick={this.playKara}>
										<i className='fas fa-play' />
									</button> : null
								}
								{scope === 'admin' && !isNonStandardPlaylist(plaid)
									&& !(this.props.playlistInfo?.flag_public && !this.props.playlistInfo?.flag_current) ?
									<button
										title={i18next.t('KARA_MENU.PLAY')}
										className="btn btn-sm btn-action playKara karaLineButton" onClick={this.editPlayingFlag}>
										<i className='fas fa-play-circle' />
									</button> : null
								}
								{scope === 'admin' && !isNonStandardPlaylist(plaid) && !kara.flag_visible ?
									<button type="button" className={'btn btn-sm btn-action btn-primary'} onClick={this.changeVisibilityKara}>
										<i className="fas fa-eye-slash"></i>
									</button> : null
								}
							</div>
							{is_touch_device() ?
								<div className="tagConteneur mobile">
									{this.karaTags}
									{kara.versions?.sort(sortTagByPriority).map(t =>
										<span className="tag white" key={t.tid}>{getTagInLocale(t, this.props.i18nTag)}</span>
									)}
									{!(is_touch_device() && scope === 'admin') && shouldShowProfile ?
										<div className="img-container">
											<ProfilePicture className={`img-circle${is_touch_device() ? ' mobile' : ''}`}
												alt="User Pic" user={{
													login: this.props.kara.username,
													avatar_file: this.props.avatar_file,
													nickname: this.props.kara.username
												}} />
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
