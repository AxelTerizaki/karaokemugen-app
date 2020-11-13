import i18next from 'i18next';
import React, { Component } from 'react';

import { GlobalContextInterface } from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { is_touch_device } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';

interface IProps {
	kara: KaraElement;
	side: number;
	idPlaylist: number;
	idPlaylistTo: number;
	publicOuCurrent?: boolean | undefined;
	topKaraMenu: number;
	leftKaraMenu: number;
	closeKaraMenu: () => void;
	transferKara: (event: any, pos?: number) => void;
	context: GlobalContextInterface;
}

interface IState {
	kara?: KaraElement;
}

class KaraMenuModal extends Component<IProps, IState> {

	constructor(props: IProps) {
		super(props);
		this.state = {
			kara: this.props.kara
		};
		this.getKaraDetail();
	}

	getKaraDetail = async () => {
		let url;
		let data;
		if (this.props.idPlaylist && this.props.idPlaylist > 0) {
			url = 'getPLC';
			data = {
				pl_id: this.props.idPlaylist,
				plc_id: this.props.kara.playlistcontent_id
			};
		} else {
			url = 'getKara';
			data = { kid: this.props.kara.kid };
		}
		const response = await commandBackend(url, data);
		this.setState({ kara: response });
		document.getElementById('root').addEventListener('click', this.handleClick);
	};

	onRightClickTransfer = (e: any) => {
		e.preventDefault();
		e.stopPropagation();
		this.props.transferKara(e, this.getPosPlayingOpposite(this.props.side));
		this.props.closeKaraMenu();
	};


	freeKara = () => {
		commandBackend('editPLC', {
			pl_id: this.props.idPlaylist,
			plc_id: this.state.kara?.playlistcontent_id,
			flag_free: true
		});
		this.props.closeKaraMenu();
	};


	changeVisibilityKara = () => {
		commandBackend('editPLC', {
			pl_id: this.props.idPlaylist,
			plc_id: this.state.kara?.playlistcontent_id,
			flag_visible: !this.state.kara?.flag_visible
		});
		this.props.closeKaraMenu();
	};

	makeFavorite = () => {
		this.state.kara?.flag_favorites ?
			commandBackend('deleteFavorites', { 'kid': [this.state.kara?.kid] }) :
			commandBackend('addFavorites', { 'kid': [this.state.kara?.kid] });
		this.props.closeKaraMenu();
	};

	addToBlacklist = () => {
		commandBackend('createBLC', {
			blcriteria_type: 1001,
			blcriteria_value: this.state.kara?.kid,
			set_id: this.props.context.globalState.frontendContext.currentBlSet
		});
		this.props.closeKaraMenu();
	}

	addToWhitelist = () => {
		commandBackend('addKaraToWhitelist', { kid: [this.state.kara?.kid] });
		this.props.closeKaraMenu();
	}

	handleClick = (e: MouseEvent) => {
		if (!(e.target as Element).closest('#modal')) {
			this.props.closeKaraMenu();
		}
	}

	componentWillUnmount() {
		document.getElementById('root').removeEventListener('click', this.handleClick);
	}

	getPosPlaying(side: number) {
		return side === 1 ? this.props.context.globalState.frontendContext.posPlaying1 : this.props.context.globalState.frontendContext.posPlaying2;
	}

	getPosPlayingOpposite(side: number) {
		return side === 1 ? this.props.context.globalState.frontendContext.posPlaying2 : this.props.context.globalState.frontendContext.posPlaying1;
	}

	render() {
		return (
			this.state.kara ?
				<ul
					className="dropdown-menu"
					style={{
						position: 'absolute',
						zIndex: 9998,
						bottom: window.innerHeight < (this.props.topKaraMenu + 250) ? (window.innerHeight - this.props.topKaraMenu) + (is_touch_device() ? 65 : 35) : undefined,
						top: window.innerHeight < (this.props.topKaraMenu + 250) ? undefined : this.props.topKaraMenu,
						left: window.innerWidth < (this.props.leftKaraMenu + 250) ? window.innerWidth - 250 : this.props.leftKaraMenu
					}}>
					{this.props.idPlaylistTo >= 0 && this.props.idPlaylist >= 0 ?
						<li>
							<a href="#" onContextMenu={this.onRightClickTransfer} onClick={(event) => {
								this.props.transferKara(event);
								this.props.closeKaraMenu();
							}}>
								<i className="fas fa-exchange-alt" />
								&nbsp;
								{i18next.t('KARA_MENU.TRANSFER_KARA')}
							</a>
						</li> : null
					}
					{this.props.idPlaylist >= 0 && !this.props.kara?.flag_playing ?
						<li>
							<a href="#" onClick={() => {
								commandBackend('editPLC', {
									pos: this.getPosPlaying(this.props.side) + 1,
									pl_id: this.props.idPlaylist,
									plc_id: this.props.kara.playlistcontent_id
								});
								this.props.closeKaraMenu();
							}}>
								<i className="fas fa-level-up-alt" />
								&nbsp;
								{i18next.t('KARA_MENU.MOVE_KARA')}
							</a>
						</li> : null
					}
					<li>
						<a href="#" onClick={this.makeFavorite}>
							<i className="fas fa-star" />
							&nbsp;
							{this.state.kara.flag_favorites ? i18next.t('TOOLTIP_FAV_DEL') : i18next.t('TOOLTIP_FAV')}
						</a>
					</li>
					{this.props.publicOuCurrent && !this.state.kara.flag_free ?
						<li>
							<a href="#" onClick={this.freeKara} title={i18next.t('KARA_MENU.FREE')}>
								<i className="fas fa-gift" />
								&nbsp;
								{i18next.t('KARA_MENU.FREE_SHORT')}
							</a>
						</li> : null
					}
					{this.props.idPlaylist >= 0 ?
						<li>
							<a href="#" onClick={this.changeVisibilityKara}
								title={this.state.kara.flag_visible ? i18next.t('KARA_MENU.VISIBLE_OFF') : i18next.t('KARA_MENU.VISIBLE_ON')}>
								{this.state.kara.flag_visible ?
									<React.Fragment>
										<i className="fas fa-eye-slash" />
										&nbsp;
										{i18next.t('KARA_MENU.VISIBLE_OFF_SHORT')}
									</React.Fragment> :
									<React.Fragment>
										<i className="fas fa-eye" />
										&nbsp;
										{i18next.t('KARA_MENU.VISIBLE_ON_SHORT')}
									</React.Fragment>
								}
							</a>
						</li> : null
					}
					{this.props.idPlaylist !== -2 && this.props.idPlaylist !== -4 ?
						<li>
							<a href="#" onClick={this.addToBlacklist}>
								<i className="fas fa-ban" />
								&nbsp;
								{i18next.t('KARA_MENU.ADD_BLACKLIST')}
							</a>
						</li> : null
					}
					{this.props.idPlaylist !== -3 ?
						<li>
							<a href="#" onClick={this.addToWhitelist}>
								<i className="fas fa-check-circle" />
								&nbsp;
								{i18next.t('KARA_MENU.ADD_WHITELIST')}
							</a>
						</li> : null
					}
				</ul> : null
		);
	}
}

export default KaraMenuModal;