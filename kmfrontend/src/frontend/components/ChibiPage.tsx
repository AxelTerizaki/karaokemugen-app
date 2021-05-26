import i18next from 'i18next';
import merge from 'lodash.merge';
import React, { Component } from 'react';

import { PublicPlayerState } from '../../../../src/types/state';
import nanamiSingPng from '../../assets/nanami-sing.png';
import nanamiSingWebp from '../../assets/nanami-sing.webp';
import { login } from '../../store/actions/auth';
import GlobalContext from '../../store/context';
import { sendIPC } from '../../utils/electron';
import { commandBackend, getSocket } from '../../utils/socket';
import KmAppHeaderDecorator from './decorators/KmAppHeaderDecorator';
import KmAppWrapperDecorator from './decorators/KmAppWrapperDecorator';
import AdminButtons from './karas/AdminButtons';
import ProgressBar from './karas/ProgressBar';

interface IState {
	statusPlayer?: PublicPlayerState;
	playlistList: PlaylistElem[];
	onTop?: boolean;
}

class ChibiPage extends Component<unknown, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props) {
		super(props);
		this.state = {
			playlistList: []
		};
	}

	async componentDidMount() {
		if (new URL(window.location.toString()).searchParams.has('admpwd') && !this.context.globalState.auth.isAuthenticated) {
			await login('admin', new URL(window.location.toString()).searchParams.get('admpwd'), this.context.globalDispatch);
		}
		if (this.context.globalState.auth.isAuthenticated) {
			getSocket().on('playerStatus', this.playerUpdate);
			try {
				const result = await commandBackend('getPlayerStatus');
				this.playerUpdate(result);
				this.setState({onTop: this.context.globalState.settings.data.config.GUI.ChibiPlayer.AlwaysOnTop });
			} catch (e) {
				// already display
			}
			await this.getPlaylistList();
		}
	}

	getPlaylistList = async () => {
		const playlistList = await commandBackend('getPlaylists');
		this.setState({ playlistList: playlistList });
	};

	playerUpdate = (data: PublicPlayerState) => {
		let val = data.volume;
		const base = 100;
		const pow = 0.76;
		val = val / base;
		data.volume = base * Math.pow(val, 1 / pow);
		this.setState({ statusPlayer: merge(this.state.statusPlayer, data) });
	}

	putPlayerCommando(event: any) {
		const namecommand = event.currentTarget.getAttribute('data-namecommand');
		let data;
		if (namecommand === 'setVolume') {
			let volume = parseInt(event.currentTarget.value);
			const base = 100;
			const pow = 0.76;
			volume = Math.pow(volume, pow) / Math.pow(base, pow);
			volume = volume * base;
			data = {
				command: namecommand,
				options: volume,
			};
		} else if (namecommand === 'goTo') {
			data = {
				command: namecommand,
				options: 0
			};
		} else {
			data = {
				command: namecommand
			};
		}
		commandBackend('sendPlayerCommand', data).catch(() => {});
	}

	electronCmd = (event: any) => {
		const namecommand = event.currentTarget.getAttribute('data-namecommand');
		if (event.currentTarget.getAttribute('data-namecommand') === 'setChibiPlayerAlwaysOnTop') {
			this.setState({ onTop: !this.state.onTop });
		}
		return sendIPC(namecommand);
	}

	setVolume = (event) => {
		const state = {...this.state.statusPlayer};
		state.volume = event.target.value;
		this.setState({statusPlayer : state});
	}

	render() {
		return (
			<>
				<KmAppWrapperDecorator chibi>
					<div className="header-group floating-controls">
						<p>
							<picture>
								<source type="image/webp" srcSet={nanamiSingWebp} />
								<source type="image/png" srcSet={nanamiSingPng} />
								<img src={nanamiSingPng} alt="Nanami logo"/>
							</picture>
							Karaoke Mugen Chibi Player
						</p>
						<button
							className="btn"
							title={i18next.t('CHIBI.FOCUS')}
							data-namecommand="focusMainWindow"
							onClick={this.electronCmd}
						>
							<i className="fas fa-fw fa-external-link-alt" />
						</button>
						<button
							className={`btn${this.state.onTop ? ' btn-primary':''}`}
							title={i18next.t('CHIBI.ONTOP')}
							data-namecommand="setChibiPlayerAlwaysOnTop"
							onClick={this.electronCmd}
						>
							<i className="fas fa-fw fa-window-restore" />
						</button>
						<button
							className="btn btn-danger"
							title={i18next.t('CHIBI.CLOSE')}
							data-namecommand="closeChibiPlayer"
							onClick={this.electronCmd}
						>
							<i className="fas fa-fw fa-times" />
						</button>
					</div>
					<KmAppHeaderDecorator mode="admin">
						<div className="header-group controls">
							<button
								type="button"
								title={i18next.t('MUTE_UNMUTE')}
								className="btn btn-dark volumeButton"
							>
								<div id="mute"
									 data-namecommand={(this.state.statusPlayer?.volume === 0 || this.state.statusPlayer?.mute) ? 'unmute' : 'mute'}
									 onClick={this.putPlayerCommando}
								>
									{
										this.state.statusPlayer?.volume === 0 || this.state.statusPlayer?.mute
											? <i className="fas fa-volume-mute"></i>
											: (
												this.state.statusPlayer?.volume > 66
													? <i className="fas fa-volume-up"></i>
													: (
														this.state.statusPlayer?.volume > 33
															? <i className="fas fa-volume-down"></i>
															: <i className="fas fa-volume-off"></i>
													)
											)
									}
								</div>
								<input
									title={i18next.t('VOLUME_LEVEL')}
									data-namecommand="setVolume"
									id="volume"
									value={this.state.statusPlayer?.volume}
									type="range"
									onChange={this.setVolume}
									onMouseUp={this.putPlayerCommando}
								/>
							</button>
							<AdminButtons
								putPlayerCommando={this.putPlayerCommando}
								statusPlayer={this.state.statusPlayer}
								currentPlaylist={this.state.playlistList.find(playlistElem => playlistElem.flag_current)} />
							<button
								title={i18next.t(this.state.statusPlayer?.showSubs ? 'HIDE_SUBS' : 'SHOW_SUBS')}
								id="showSubs"
								data-namecommand={this.state.statusPlayer?.showSubs ? 'hideSubs' : 'showSubs'}
								className={`btn btn-dark subtitleButton ${this.state.statusPlayer?.showSubs ? 'showSubs' : 'hideSubs'}`}
								onClick={this.putPlayerCommando}
							>
								<span className="fa-stack">
									<i className="fas fa-closed-captioning fa-stack-1x" />
									<i className="fas fa-ban fa-stack-2x" style={{ color: '#943d42', opacity: 0.7 }} />
								</span>
								<i className="fas fa-closed-captioning" />
							</button>
						</div>
					</KmAppHeaderDecorator>
					<ProgressBar/>
				</KmAppWrapperDecorator>
			</>
		);
	}
}

export default ChibiPage;


