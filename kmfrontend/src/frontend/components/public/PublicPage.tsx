import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Route, RouteComponentProps, Switch } from 'react-router';

import { DBPLC, DBPLCInfo } from '../../../../../src/types/database/playlist';
import { PublicPlayerState } from '../../../../../src/types/state';
import { setFilterValue } from '../../../store/actions/frontendContext';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { displayMessage, secondsTimeSpanToHMS } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import { View } from '../../types/view';
import KmAppBodyDecorator from '../decorators/KmAppBodyDecorator';
import KmAppHeaderDecorator from '../decorators/KmAppHeaderDecorator';
import KmAppWrapperDecorator from '../decorators/KmAppWrapperDecorator';
import KaraDetail from '../karas/KaraDetail';
import Playlist from '../karas/Playlist';
import ClassicModeModal from '../modals/ClassicModeModal';
import PollModal from '../modals/PollModal';
import ProfilModal from '../modals/ProfilModal';
import UsersModal from '../modals/UsersModal';
import PlayerBox from './PlayerBox';
import PublicHeader from './PublicHeader';
import PublicHomepage from './PublicHomepage';
import TagsList from './TagsList';

interface IProps {
	showVideo: (file: string) => void;
	route: RouteComponentProps;
}

interface IState {
	idsPlaylist: { left: number, right: number };
	isPollActive: boolean;
	classicModeModal: boolean;
	view: View;
	tagType: number;
	kara: KaraElement;
	playerStopping: boolean;
	playerStopped: boolean;
	top: string;
	bottom: string;
	searchValue?: string;
	searchCriteria?: 'year' | 'tag';
	publicVisible: boolean;
	currentVisible: boolean;
	indexKaraDetail?: number;
	searchType: 'search' | 'recent' | 'requested';
}

let timer: any;

class PublicPage extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			isPollActive: false,
			idsPlaylist: { left: -1, right: 0 },
			classicModeModal: false,
			view: 'home',
			tagType: undefined,
			kara: undefined,
			playerStopping: false,
			playerStopped: false,
			top: '0',
			bottom: '0',
			publicVisible: true,
			currentVisible: true,
			searchType: 'search'
		};
	}

	changeView = async (
		view: View,
		tagType?: number,
		searchValue?: string,
		searchCriteria?: 'year' | 'tag'
	) => {
		let route;
		let searchType: 'search' | 'recent' | 'requested' = 'search';
		if (view === 'home') {
			route = '/public';
		} else if (view === 'tag') {
			tagType = tagType !== undefined ? tagType : this.state.tagType;
			route = `/public/tags/${tagType}`;
		}
		const idsPlaylist = this.state.idsPlaylist;
		if (view === 'favorites') {
			idsPlaylist.left = -5;
			route = '/public/favorites';
		} else if (view === 'requested') {
			idsPlaylist.left = -1;
			searchType = 'requested';
			route = '/public/search/requested';
		} else if (view === 'history') {
			idsPlaylist.left = -1;
			searchType = 'recent';
			route = '/public/search/history';
		} else if (view === 'search') {
			idsPlaylist.left = -1;
			route = '/public/search';
		} else if (view === 'publicPlaylist') {
			idsPlaylist.left = this.context.globalState.settings.data.state.publicPlaylistID;
			route = `/public/playlist/${idsPlaylist.left}`;
		} else if (view === 'currentPlaylist') {
			idsPlaylist.left = this.context.globalState.settings.data.state.currentPlaylistID;
			route = `/public/playlist/${idsPlaylist.left}`;
		}
		setFilterValue(
			this.context.globalDispatch,
			'',
			1,
			this.state.idsPlaylist.left
		);
		this.setState({ view, tagType, idsPlaylist, searchValue, searchCriteria, searchType, kara: undefined });
		this.props.route.history.push(route);
	};

	majIdsPlaylist = (side: number, value: number) => {
		const idsPlaylist = this.state.idsPlaylist;
		if (side === 1) {
			idsPlaylist.left = Number(value);
		}
		this.setState({ idsPlaylist: idsPlaylist });
	};

	initView() {
		if (this.props.route.location.pathname.includes('/public/search/requested')) {
			this.changeView('requested');
		} if (this.props.route.location.pathname.includes('/public/search/history')) {
			this.changeView('history');
		} else if (this.props.route.location.pathname.includes('/public/search')) {
			this.changeView('search');
		} else if (this.props.route.location.pathname.includes('/public/favorites')) {
			this.changeView('favorites');
		} else if (this.props.route.location.pathname.includes('/public/tags')) {
			const tagType = Number(this.props.route.location.pathname.substring(this.props.route.location.pathname.lastIndexOf('/') + 1));
			this.changeView('tag', tagType);
		} else if (this.props.route.location.pathname.includes('/public/playlist')) {
			const idPlaylist = Number(this.props.route.location.pathname.substring(this.props.route.location.pathname.lastIndexOf('/') + 1));
			if (idPlaylist === this.context.globalState.settings.data.state.publicPlaylistID) {
				this.changeView('publicPlaylist');
			} else if (idPlaylist === this.context.globalState.settings.data.state.currentPlaylistID) {
				this.changeView('currentPlaylist');
			}
		}
	}

	async componentDidMount() {
		if (this.context?.globalState.settings.data.config?.Frontend?.Mode !== 0) await this.getPlaylistList();
		this.initView();
		getSocket().on('playlistInfoUpdated', this.getPlaylistList);
		getSocket().on('playerStatus', this.displayClassicModeModal);
		getSocket().on('newSongPoll', this.newSongPoll);
		getSocket().on('songPollEnded', this.songPollEnded);
		getSocket().on('songPollResult', this.songPollResult);
		getSocket().on('adminMessage', this.adminMessage);
		getSocket().on('userSongPlaysIn', this.userSongPlaysIn);
		getSocket().on('nextSong', this.nextSong);
	}

	componentWillUnmount() {
		getSocket().off('playerStatus', this.displayClassicModeModal);
		getSocket().off('newSongPoll', this.newSongPoll);
		getSocket().off('songPollEnded', this.songPollEnded);
		getSocket().off('songPollResult', this.songPollResult);
		getSocket().off('adminMessage', this.adminMessage);
		getSocket().off('userSongPlaysIn', this.userSongPlaysIn);
		getSocket().off('nextSong', this.nextSong);
	}

	getPlaylistList = async () => {
		const playlistsList = await commandBackend('getPlaylists');
		playlistsList.forEach(playlist => {
			if (playlist.flag_public) {
				this.setState({ publicVisible: playlist.flag_visible });
			}
			if (playlist.flag_current) {
				this.setState({ currentVisible: playlist.flag_visible });
			}
		});
	}

	newSongPoll = () => {
		if (this.context.globalState.auth.isAuthenticated) {
			this.setState({ isPollActive: true });
			ReactDOM.render(<PollModal hasVoted={() => this.setState({ isPollActive: false })} context={this.context} />,
				document.getElementById('modal'));
		}
	}

	songPollEnded = () => {
		this.setState({ isPollActive: false });
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	}

	songPollResult = (data: any) => {
		displayMessage('success', i18next.t('POLLENDED', { kara: data.kara.substring(0, 100), votes: data.votes }));
	}

	adminMessage = (data: any) => displayMessage('info', <div><label>{i18next.t('CL_INFORMATIVE_MESSAGE')}</label> <br />{data.message}</div>, data.duration)

	userSongPlaysIn = (data: DBPLCInfo) => {
		if (data && data.username === this.context.globalState.auth.data.username) {
			const playTime = new Date(Date.now() + data.time_before_play * 1000);
			const playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
			const beforePlayTime = secondsTimeSpanToHMS(data.time_before_play, 'hm');
			displayMessage('info', i18next.t('USER_SONG_PLAYS_IN', {
				kara: buildKaraTitle(this.context.globalState.settings.data, data, true),
				time: beforePlayTime,
				date: playTimeDate
			}));
		}
	}

	nextSong = (data: DBPLC) => {
		if (data && data.flag_visible && !this.state.playerStopping) {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				displayMessage('info',
					<div>
						<label>{i18next.t('NEXT_SONG_MESSAGE')}</label>
						<br />
						{buildKaraTitle(this.context.globalState.settings.data, data, true)}
					</div>);
			}, 500);
		}
	}

	displayClassicModeModal = (data: PublicPlayerState) => {
		if (data.stopping !== undefined) this.setState({ playerStopping: data.stopping });
		if (data.playerStatus === 'stop') this.setState({ playerStopped: true });
		else if (typeof data.playerStatus === 'string') this.setState({ playerStopped: false });
		if (this.state.playerStopped
			&& data.currentRequester === this.context.globalState.auth.data.username
			&& !this.state.classicModeModal) {
			ReactDOM.render(<ClassicModeModal />, document.getElementById('modal'));
			this.setState({ classicModeModal: true });
		} else if (!this.state.playerStopped && this.state.classicModeModal) {
			const element = document.getElementById('modal');
			if (element) ReactDOM.unmountComponentAtNode(element);
			this.setState({ classicModeModal: false });
		}
	};

	toggleKaraDetail = (kara: KaraElement, _idPlaylist: number, indexKaraDetail: number) => {
		this.setState({ kara, indexKaraDetail });
		this.props.route.history.push(`/public/karaoke/${kara.kid}`);
	};

	render() {
		return (
			<>
				<PublicHeader
					openModal={(type: string) => this.props.route.history.push(`/public/${type}`)}
					onResize={top => this.setState({ top })}
					changeView={this.changeView} currentView={this.state.view} />
				<PlayerBox
					fixed={true}
					show={this.state.view !== 'home'}
					currentVisible={this.state.currentVisible}
					goToCurrentPL={() => this.changeView('currentPlaylist')}
					onResize={bottom => this.setState({ bottom })}
				/>
				<KmAppWrapperDecorator single top={this.state.top} bottom={this.state.bottom} view={this.state.view}
					hmagrin={(!['favorites', 'publicPlaylist', 'currentPlaylist', 'tag', 'search']
						.includes(this.state.view)) && this.state.kara === undefined}>
					<Switch>
						<Route path="/public/user" render={() =>
							<ProfilModal
								context={this.context}
								scope='public'
								closeProfileModal={() => this.props.route.history.goBack()}
							/>
						} />
						<Route path="/public/users" render={() =>
							<UsersModal
								context={this.context}
								scope='public'
								closeModal={() => this.props.route.history.goBack()}
							/>
						} />
						<Route path="/public/karaoke/:kid" render={({ match }) =>
							<KaraDetail kid={this.state.kara?.kid || match.params.kid}
								playlistcontentId={this.state.kara?.playlistcontent_id}
								scope='public'
								idPlaylist={this.state.idsPlaylist.left}
								showVideo={this.props.showVideo}
								context={this.context}
								closeOnPublic={() => {
									this.props.route.history.goBack();
									this.setState({ kara: undefined });
								}}
								changeView={this.changeView} />
						} />
						<Route path={[
							'/public/search',
							'/public/playlist/:pl_id',
							'/public/favorites',
							'/public/tags/:tagType'
						]} render={({ match }) =>
							<React.Fragment>
								<KmAppHeaderDecorator mode="public">
									<button
										className="btn side2Button"
										type="button"
										onClick={() => this.changeView((this.state.view === 'search' && this.state.searchCriteria ? 'tag' : 'home'))}>
										<i className="fas fa-arrow-left" />
									</button>
									<div
										className="plSearch"
									>
										<input
											placeholder={`\uF002 ${i18next.t('SEARCH')}`}
											type="text"
											defaultValue={this.context.globalState.frontendContext.filterValue1}
											onChange={e =>
												setFilterValue(
													this.context.globalDispatch,
													e.target.value,
													1,
													this.state.idsPlaylist.left
												)
											}
										/>
									</div>
									{this.state.isPollActive ? (
										<button
											className="btn btn-default showPoll"
											onClick={() => ReactDOM.render(
												<PollModal hasVoted={() => this.setState({ isPollActive: false })} context={this.context} />,
												document.getElementById('modal'))
											}
										>
											<i className="fas fa-chart-line" />
										</button>
									) : null}
								</KmAppHeaderDecorator>

								<KmAppBodyDecorator
									mode={this.context?.globalState.settings.data.config?.Frontend?.Mode}
									extraClass='JustPlaylist fillSpace'
								>
									{this.state.view === 'tag' ?
										<TagsList
											tagType={this.state.tagType}
											changeView={this.changeView}
										/> :
										<Playlist
											scope="public"
											side={1}
											idPlaylist={Number(match.params.pl_id) || this.state.idsPlaylist.left}
											idPlaylistTo={this.context.globalState.settings.data.state.publicPlaylistID}
											majIdsPlaylist={this.majIdsPlaylist}
											toggleKaraDetail={this.toggleKaraDetail}
											searchValue={this.state.searchValue}
											searchCriteria={this.state.searchCriteria}
											indexKaraDetail={this.state.indexKaraDetail}
											clearIndexKaraDetail={() => this.setState({ indexKaraDetail: undefined })}
											searchType={
												this.props.route.location.pathname.includes('/public/search/requested') ?
													'requested' :
													(this.props.route.location.pathname.includes('/public/search/history') ?
														'recent' :
														this.state.searchType
													)
											}
										/>
									}
								</KmAppBodyDecorator>
							</React.Fragment>
						} />
						<Route path='/public' render={() =>
							<PublicHomepage
								changeView={this.changeView}
								activePoll={this.state.isPollActive}
								currentVisible={this.state.currentVisible}
								publicVisible={this.state.publicVisible}
								openPoll={() => ReactDOM.render(
									<PollModal hasVoted={() => this.setState({ isPollActive: false })} context={this.context} />,
									document.getElementById('modal'))
								}
							/>
						} />
					</Switch>
				</KmAppWrapperDecorator>
			</>
		);
	}
}

export default PublicPage;
