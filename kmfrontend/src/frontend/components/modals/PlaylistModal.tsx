import i18next from 'i18next';
import React, { Component } from 'react';

import { DBPL } from '../../../../../src/lib/types/database/playlist';
import { BLCSet } from '../../../../../src/types/blacklist';
import { closeModal } from '../../../store/actions/modal';
import { setSettings } from '../../../store/actions/settings';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import {displayMessage, isNonStandardPlaylist, nonStandardPlaylists} from '../../../utils/tools';

interface IProps {
	plaid?: string;
	changeIdPlaylist: (plaid: string, idBLSet?: number) => void
	mode: 'create' | 'edit';
	playlistInfo?: DBPL;
	bLSet?: BLCSet;
}

interface IState {
	name: string;
	flag_current: boolean;
	flag_public: boolean;
	flag_visible: boolean;
}

class PlaylistModal extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	state = {
		name: this.props.mode === 'edit' && (this.props.plaid === nonStandardPlaylists.blc ?
			this.props.bLSet?.name
			: this.props.playlistInfo?.name) || undefined,
		flag_current: this.props.mode === 'edit' ? (this.props.playlistInfo?.flag_current
		|| (this.props.plaid === nonStandardPlaylists.blc && this.props.bLSet.flag_current)) : false,
		flag_public: this.props.mode === 'edit' ? this.props.playlistInfo?.flag_public : false,
		flag_visible: this.props.mode === 'edit' ? this.props.playlistInfo?.flag_visible : true,
	}

	createPlaylist = async () => {
		try {
			const response = await commandBackend(
				this.props.plaid === nonStandardPlaylists.blc ? 'createBLCSet' : 'createPlaylist',
				{
					name: this.state.name,
					flag_visible: this.state.flag_visible,
					flag_current: this.state.flag_current,
					flag_public: this.state.flag_public,
				}
			);
			this.props.plaid === nonStandardPlaylists.blc ? this.props.changeIdPlaylist(nonStandardPlaylists.blc, response.set_id) : this.props.changeIdPlaylist(response.plaid);
			this.closeModal();
		} catch (e) {
			// already display
		}
	};

	editPlaylist = async () => {
		await commandBackend(this.props.plaid === nonStandardPlaylists.blc ? 'editBLCSet' : 'editPlaylist', {
			name: this.state.name,
			set_id: this.props.bLSet?.blc_set_id,
			flag_visible: this.state.flag_visible,
			flag_current: this.state.flag_current,
			flag_public: this.state.flag_public,
			plaid: this.props.plaid
		});
		setSettings(this.context.globalDispatch);
		this.closeModal();
	};

	toggleCurrent = () => {
		if (this.props.mode === 'edit' && (this.props.playlistInfo?.flag_current
			|| (this.props.plaid === nonStandardPlaylists.blc && this.props.bLSet.flag_current))) {
			displayMessage('warning',
				this.props.plaid === nonStandardPlaylists.blc ? i18next.t('MODAL.PLAYLIST_MODAL.CANNOT_CURRENT_BLC')
					:i18next.t('MODAL.PLAYLIST_MODAL.CANNOT_CURRENT_PLAYLIST'),
				4500, 'top-center');
		} else {
			this.setState({ flag_current: !this.state.flag_current });
		}
	}

	togglePublic = () => {
		if (this.props.mode === 'edit' && this.props.playlistInfo?.flag_public) {
			displayMessage('warning', i18next.t('MODAL.PLAYLIST_MODAL.CANNOT_PUBLIC'), 4500, 'top-center');
		} else {
			this.setState({ flag_public: !this.state.flag_public });
		}
	}

	closeModal = () => {
		closeModal(this.context.globalDispatch);
	}

	render() {
		return (
			<div className="modal modalPage">
				<div className="modal-dialog">
					<div className="modal-content">
						<ul className="modal-header">
							<h4 className="modal-title">{this.props.mode === 'edit' ?
								i18next.t('MODAL.PLAYLIST_MODAL.EDIT_PLAYLIST', { playlist:
									(this.props.plaid === nonStandardPlaylists.blc ?
										this.props.bLSet?.name
										: this.props.playlistInfo?.name)
								}) :
								i18next.t('MODAL.PLAYLIST_MODAL.CREATE_PLAYLIST')
							}</h4>
						</ul>
						<div className="modal-body flex-direction-btns">
							<div>{i18next.t('MODAL.PLAYLIST_MODAL.NAME')}</div>
							<div className="form">
								<input type="text" autoFocus className="modal-input" defaultValue={this.state.name}
									onChange={(event) => this.setState({ name: event.target.value })} />
							</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={this.toggleCurrent}>
									<input type="checkbox" checked={this.state.flag_current}
										disabled={this.props.mode === 'edit' && (this.props.playlistInfo?.flag_current
										|| (this.props.plaid === nonStandardPlaylists.blc && this.props.bLSet.flag_current))}
										onChange={this.toggleCurrent} />
									<div className="btn-large-container">
										<div className="title">
											{this.props.plaid === nonStandardPlaylists.blc ?
												i18next.t('MODAL.PLAYLIST_MODAL.ACTIVE')
												:i18next.t('MODAL.PLAYLIST_MODAL.CURRENT')}
										</div>
										<div className="desc">
											{this.props.plaid === nonStandardPlaylists.blc ?
												i18next.t('MODAL.PLAYLIST_MODAL.ACTIVE_DESC')
												:i18next.t('MODAL.PLAYLIST_MODAL.CURRENT_DESC')}
										</div>
									</div>
								</button>
							</div>
							{!isNonStandardPlaylist(this.props.plaid) ?
								<>
									<div>
										<button className="btn btn-default"
											type="button" onClick={this.togglePublic}>
											<input type="checkbox" checked={this.state.flag_public}
												disabled={this.props.mode === 'edit' && this.props.playlistInfo?.flag_public }
												onChange={this.togglePublic} />
											<div className="btn-large-container">
												<div className="title">{i18next.t('MODAL.PLAYLIST_MODAL.PUBLIC')}</div>
												<div className="desc">{i18next.t('MODAL.PLAYLIST_MODAL.PUBLIC_DESC')}</div>
											</div>
										</button>
									</div>
									<div>
										<button className="btn btn-default"
											type="button" onClick={() => this.setState({ flag_visible: !this.state.flag_visible })}>
											<input type="checkbox" checked={this.state.flag_visible}
												onChange={() => this.setState({ flag_visible: !this.state.flag_visible })} />
											<div className="btn-large-container">
												<div className="title">{i18next.t('MODAL.PLAYLIST_MODAL.VISIBLE')}</div>
												<div className="desc">{i18next.t('MODAL.PLAYLIST_MODAL.VISIBLE_DESC')}</div>
											</div>
										</button>
									</div>
								</> : null
							}
						</div >
						<div className="modal-footer">
							<button type="button" className="btn btn-action btn-primary other" onClick={this.closeModal}>
								<i className="fas fa-times" /> {i18next.t('CANCEL')}
							</button>
							<button type="button" className="btn btn-action btn-default ok"
								onClick={this.props.mode === 'create' ? this.createPlaylist : this.editPlaylist}>
								<i className="fas fa-check" /> {this.props.mode === 'create' ?
									i18next.t('MODAL.PLAYLIST_MODAL.CREATE'):i18next.t('MODAL.PLAYLIST_MODAL.EDIT')
								}
							</button>
						</div>
					</div >
				</div >
			</div >
		);
	}
}

export default PlaylistModal;
