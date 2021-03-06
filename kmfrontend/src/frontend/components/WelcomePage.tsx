import '../styles/start/Start.scss';
import '../styles/start/WelcomePage.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import { Repository } from '../../../../src/lib/types/repo';
import { Feed } from '../../../../src/types/feeds';
import { Session } from '../../../../src/types/session';
import logo from '../../assets/Logo-final-fond-transparent.png';
import { logout } from '../../store/actions/auth';
import { showModal } from '../../store/actions/modal';
import GlobalContext from '../../store/context';
import TasksEvent from '../../TasksEvent';
import { commandBackend, getSocket } from '../../utils/socket';
import { News } from '../types/news';
import Autocomplete from './generic/Autocomplete';
import OnlineStatsModal from './modals/OnlineStatsModal';
import ProfilModal from './modals/ProfilModal';
import RestartDownloadsModal from './modals/RestartDownloadsModal';
import WelcomePageArticle from './WelcomePageArticle';

interface IState {
	news: Array<News>;
	sessions: Array<Session>;
	activeSession?: Session;
	catchphrase?: string;
	repositories: Array<Repository>;
	stats?: any;
}
class WelcomePage extends Component<unknown, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: unknown) {
		super(props);
		this.state = {
			news: [],
			sessions: [],
			repositories: []
		};
	}

	async componentDidMount() {
		if ((await commandBackend('getMigrationsFrontend')).filter(res => !res.flag_done).length > 0) {
			window.location.assign('/migrate');
		} else if (this.context?.globalState.settings.data.config?.Online.Stats === undefined
			|| this.context?.globalState.settings.data.config?.Online.ErrorTracking === undefined) {
			showModal(this.context.globalDispatch, <OnlineStatsModal />);
		} else {
			this.getDownloadQueue();
		}
		this.getCatchphrase();
		this.getNewsFeed();
		this.getSessions();
		this.getRepositories();
		this.getStats();
		getSocket().on('statsRefresh', this.getStats);
	}

	componentWillUnmount() {
		getSocket().off('statsRefresh', this.getStats);
	}

	getSessions = async () => {
		const res = await commandBackend('getSessions');
		this.setState({
			sessions: res,
			activeSession: res.filter((valueSession: Session) => valueSession.active)[0]
		});
	};

	getDownloadQueue = async () => {
		const [downloadQueue, downloadQueueStatus] = await Promise.all([
			commandBackend('getDownloads', undefined, false, 300000),
			commandBackend('getDownloadQueueStatus', undefined, false, 300000),
		]);
		if (downloadQueueStatus === 'stopped' && downloadQueue.length > 0 && !sessionStorage.getItem('dlQueueRestart')) {
			showModal(this.context.globalDispatch, <RestartDownloadsModal />);
		}
	}

	getRepositories = async () => {
		const res = await commandBackend('getRepos');
		this.setState({
			repositories: res
		});
	};

	getStats = async () => {
		const res = await commandBackend('getStats');
		this.setState({
			stats: res
		});
	};

	setActiveSession = async (value: string) => {
		const sessions: Array<Session> = this.state.sessions.filter(
			session => session.name === value
		);
		let sessionId;
		if (sessions.length === 0) {
			const res = await commandBackend('createSession', { name: value });
			sessionId = res;
			const sessionsList = await commandBackend('getSessions');
			this.setState({
				sessions: sessionsList,
				activeSession: sessionsList.filter((valueSession: Session) => valueSession.active)[0]
			});
		} else {
			this.setState({ activeSession: sessions[0] });
			sessionId = sessions[0].seid;
			commandBackend('activateSession', { seid: sessionId });
		}
	};

	getCatchphrase = async () => {
		const res = await commandBackend('getCatchphrase');
		this.setState({ catchphrase: res });
	};

	getNewsFeed = async () => {
		try {
			const data: Feed[] = await commandBackend('getNewsFeed', undefined, undefined, 300000);
			const base = data.find(d => d.name === 'git_base');
			const appli = data.find(d => d.name === 'git_app');
			const mast = data.find(d => d.name === 'mastodon');
			const system = data.find(d => d.name === 'system');
			const news: News[] = [];
			if (base?.body && appli?.body) {
				base.body = JSON.parse(base.body);
				appli.body = JSON.parse(appli.body);
				news.push(
					{
						html: base.body.feed.entry[0].content._text,
						date: base.body.feed.entry[0].updated._text,
						dateStr: new Date(
							base.body.feed.entry[0].updated._text
						).toLocaleDateString(),
						title:
							i18next.t('BASE_UPDATE') +
							' : ' +
							base.body.feed.title._text +
							(base.body.feed.entry[0].summary._text
								? ' - ' + base.body.feed.entry[0].summary._text
								: ''),
						link: base.body.feed.entry[0].link._attributes.href,
						type: 'base'
					},
					{
						html: appli.body.feed.entry[0].content._text,
						date: appli.body.feed.entry[0].updated._text,
						dateStr: new Date(
							appli.body.feed.entry[0].updated._text
						).toLocaleDateString(),
						title:
							i18next.t('APP_UPDATE') +
							' : ' +
							appli.body.feed.entry[0].title._text +
							(appli.body.feed.entry[0].summary._text
								? ' - ' + appli.body.feed.entry[0].summary._text
								: ''),
						link: appli.body.feed.entry[0].link._attributes.href,
						type: 'app'
					}
				);
			}
			if (mast?.body) {
				mast.body = JSON.parse(mast.body);
				const max =
					mast.body.rss.channel.item.length > 3
						? 3
						: mast.body.rss.channel.item.length;
				for (let i = 0; i < max; i++) {
					news.push({
						html: mast.body.rss.channel.item[i].description._text,
						date: mast.body.rss.channel.item[i].pubDate._text,
						dateStr: new Date(
							mast.body.rss.channel.item[i].pubDate._text
						).toLocaleDateString(),
						title: i18next.t('MASTODON_UPDATE'),
						link: mast.body.rss.channel.item[i].link._text,
						type: 'mast'
					});
				}
			}
			if (system?.body) {
				for (const message of JSON.parse(system.body)) {
					news.push(message);
				}
			}
			news.sort((a, b) => {
				const dateA = new Date(a.date);
				const dateB = new Date(b.date);
				return dateA < dateB ? 1 : dateA > dateB ? -1 : 0;
			});
			this.setState({ news });
		} catch (err) {
			// error already display
		}
	};

	toggleProfileModal = () => {
		showModal(this.context.globalDispatch, <ProfilModal scope="admin" />);
	};

	render() {
		const sessions: [{ label: string, value: string }?] = [];
		for (const session of this.state.sessions) {
			sessions.push({ label: session.name, value: session.name });
		}
		return (
			<div className="start-page">
				<div className="wrapper welcome">
					<div className="logo">
						<img src={logo} alt="Logo Karaoke Mugen" />
					</div>
					<TasksEvent limit={3} isWelcomePage={true} />
					<div className="aside">
						<nav>
							<ul>
								<li><a href="http://mugen.karaokes.moe/contact.html"><i className="fas fa-fw fa-pencil-alt" />{i18next.t('WELCOME_PAGE.CONTACT')}</a></li>
								<li><a href="http://mugen.karaokes.moe/"><i className="fas fa-fw fa-link" />{i18next.t('WELCOME_PAGE.SITE')}</a></li>
								<li><a href="#" onClick={this.toggleProfileModal}>
									<i className="fas fa-fw fa-user" /><span>{this.context.globalState.settings.data.user.nickname}</span>
								</a></li>
								<li>
									<a
										href="#"
										title={i18next.t('LOGOUT')}
										className="logout"
										onClick={() => logout(this.context.globalDispatch)}
									><i className="fas fa-fw fa-sign-out-alt" /><span>{i18next.t('LOGOUT')}</span></a>
								</li>
							</ul>
						</nav>
						<div className="session-setting">
							{sessions.length > 0 ? (
								<React.Fragment>
									<article>
										<label>{i18next.t('ACTIVE_SESSION')}</label>
										<Autocomplete
											value={this.state.activeSession?.name}
											options={sessions}
											onChange={this.setActiveSession}
											acceptNewValues={true}
										/>
									</article>
									<article>
										<a href={`/system/sessions/${this.state.activeSession?.seid}`} title={i18next.t('EDIT_SESSION')} >
											<i className="fas fa-fw fa-edit" />
										</a>
									</article>
								</React.Fragment>
							) : null}
						</div>
					</div>

					<main className="main">

						<section className="tiles-panel">
							{
								this.context?.globalState.settings.data.user?.flag_tutorial_done
									? <article className="tile-manage">
										<button type="button" onClick={() => window.location.assign('/admin' + window.location.search)}>
											<i className="fas fa-fw fa-list" /><span>{i18next.t('WELCOME_PAGE.KARAMANAGER')}</span>
										</button>
									</article>
									: <article className="tile-tutorial">
										<button type="button" onClick={() => window.location.assign('/admin' + window.location.search)}>
											<i className="fas fa-fw fa-hand-point-right" /><span>{i18next.t('WELCOME_PAGE.GETSTARTED')}</span>
										</button>
									</article>
							}
							<article className="tile-system">
								<button type="button" onClick={() => window.location.assign('/system')}>
									<i className="fas fa-fw fa-cog" /><span>{i18next.t('WELCOME_PAGE.ADMINISTRATION')}</span>
								</button>
							</article>
							<article className="tile-system">
								<button type="button" onClick={() => window.location.assign('/public' + window.location.search)}>
									<i className="fas fa-fw fa-user" /><span>{i18next.t('WELCOME_PAGE.PUBLIC')}</span>
								</button>
							</article>
							<article className="tile-help">
								<button type="button" onClick={() => window.location.assign('https://mugen.karaokes.moe/docs/')}>
									<i className="fas fa-fw fa-question-circle" /><span>{i18next.t('WELCOME_PAGE.HELP')}</span>
								</button>
							</article>
							<article className="tile-download">
								<button type="button" onClick={() => window.location.assign('/system/karas/download')}>
									<i className="fas fa-fw fa-download" /><span>{i18next.t('WELCOME_PAGE.DOWNLOAD')}</span>
								</button>
							</article>
							<article className="tile-logs">
								<button type="button" onClick={() => window.location.assign('/system/log')}>
									<i className="fas fa-fw fa-terminal" /><span>{i18next.t('WELCOME_PAGE.LOGS')}</span>
								</button>
							</article>
							<article className="tile-stats">
								<blockquote>
									<label>
										<i className="fas fa-fw fa-chart-line" />{i18next.t('WELCOME_PAGE.STATS')}
									</label>
									<ul>
										<li onClick={() => window.location.assign('/system/karas')}>
											<strong>{i18next.t('WELCOME_PAGE.STATS_KARAS')}</strong>
											<span>{this.state.stats?.karas}</span>
										</li>
										<li onClick={() => window.location.assign('/system/tags?type=1')}>
											<strong>{i18next.t('WELCOME_PAGE.STATS_SERIES')}</strong>
											<span>{this.state.stats?.series}</span>
										</li>
										<li onClick={() => window.location.assign('/system/tags')}>
											<strong>{i18next.t('WELCOME_PAGE.STATS_TAGS')}</strong>
											<span>{this.state.stats?.tags}</span>
										</li>
									</ul>
								</blockquote>
							</article>
							<article className="tile-repositories">
								<blockquote>
									<button type="button" onClick={() => window.location.assign('/system/repositories')}>
										<i className="fas fa-fw fa-network-wired" />{i18next.t('WELCOME_PAGE.REPOSITORY')}
									</button>
									<ul>
										{this.state.repositories.map(repository => {
											return (
												<li key={repository.Name} className={repository.Enabled ? '' : 'disabled'}
													onClick={() => window.location.assign(`/system/repositories/${repository.Name}`)}>
													<i className={`fas fa-fw ${repository.Online ? ' fa-globe' : 'fa-laptop'}`} />
													<span>{repository.Name}</span>
												</li>
											);
										})}
									</ul>
								</blockquote>
							</article>
						</section>

						<section className="feed-panel">
							<header>
								<p>{this.state.catchphrase}</p>
							</header>
							<div>
								{this.state.news.map(article => {
									return (
										<WelcomePageArticle key={article.date} article={article} />
									);
								})}
							</div>
						</section>

					</main>

				</div>
			</div>
		);
	}
}

export default WelcomePage;
