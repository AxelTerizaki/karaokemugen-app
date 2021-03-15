import './KaraDetail.scss';

import i18next from 'i18next';
import React, { Component, MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { DBKaraTag, lastplayed_ago } from '../../../../../src/lib/types/database/kara';
import { DBPLCInfo } from '../../../../../src/types/database/playlist';
import { setBgImage } from '../../../store/actions/frontendContext';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import {formatLyrics, getPreviewLink} from '../../../utils/kara';
import { commandBackend, isRemote } from '../../../utils/socket';
import { tagTypes, YEARS } from '../../../utils/tagTypes';
import { displayMessage, is_touch_device, secondsTimeSpanToHMS } from '../../../utils/tools';
import { View } from '../../types/view';
import InlineTag from './InlineTag';

interface IProps {
	kid: string | undefined;
	scope: string;
	idPlaylist?: number;
	playlistcontentId?: number;
	closeOnPublic?: () => void;
	changeView?: (
		view: View,
		tagType?: number,
		searchValue?: string,
		searchCriteria?: 'year' | 'tag'
	) => void;
}

interface IState {
	kara?: DBPLCInfo;
	isFavorite: boolean;
	showVideo: boolean;
	lyrics: Array<string>;
}

class KaraDetail extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			isFavorite: false,
			showVideo: false,
			lyrics: []
		};
		if (this.props.kid || this.props.idPlaylist) {
			this.getKaraDetail();
		}
	}

	keyObserverHandler = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && !document.getElementById('video')) {
			this.closeModal();
		}
	}

	setBg = () => {
		if (this.props.scope === 'admin') {
			return;
		}
		const generated = this.state.kara ? `url('${getPreviewLink(this.state.kara)}')` : 'none';
		if (generated !== this.context.globalState.frontendContext.backgroundImg) {
			setBgImage(this.context.globalDispatch, generated);
		}
	}

	closeModal = () => {
		closeModal(this.context.globalDispatch);
	}

	componentDidUpdate() {
		this.setBg();
	}

	componentDidMount() {
		if (this.props.scope === 'admin' && !is_touch_device())
			document.addEventListener('keyup', this.keyObserverHandler);
		this.setBg();
	}

	componentWillUnmount() {
		if (this.props.scope === 'admin' && !is_touch_device())
			document.removeEventListener('keyup', this.keyObserverHandler);
		if (this.props.scope === 'public')
			setBgImage(this.context.globalDispatch, 'none');
	}

	onClickOutsideModal = (e: MouseEvent) => {
		if (!(e.target as Element).closest('.modal-dialog')) {
			this.closeModal();
		}
	}

	getKaraDetail = async (kid?: string) => {
		try {
			let url;
			let data;
			if (this.props.idPlaylist && this.props.idPlaylist > 0) {
				url = 'getPLC';
				data = { pl_id: this.props.idPlaylist, plc_id: this.props.playlistcontentId };
			} else {
				url = 'getKara';
				data = { kid: (kid ? kid : this.props.kid) };
			}
			const kara = await commandBackend(url, data);
			this.setState({
				kara: kara,
				isFavorite: kara.flag_favorites || this.props.idPlaylist === -5
			}, () => {
				if (kara.subfile) this.fetchLyrics();
			});
		} catch (err) {
			this.closeModal();
		}
	};

	getLastPlayed = (lastPlayed_at: Date, lastPlayed: lastplayed_ago) => {
		if (
			lastPlayed &&
			!lastPlayed.days &&
			!lastPlayed.months &&
			!lastPlayed.years
		) {
			const timeAgo =
				(lastPlayed.seconds ? lastPlayed.seconds : 0) +
				(lastPlayed.minutes ? lastPlayed.minutes * 60 : 0) +
				(lastPlayed.hours ? lastPlayed.hours * 3600 : 0);
			const timeAgoStr =
				lastPlayed.minutes || lastPlayed.hours
					? secondsTimeSpanToHMS(timeAgo, 'hm')
					: secondsTimeSpanToHMS(timeAgo, 'ms');

			return i18next.t('DETAILS_LAST_PLAYED_2', { time: timeAgoStr });
		} else if (lastPlayed_at) {
			return i18next.t('DETAILS_LAST_PLAYED', { date: new Date(lastPlayed_at).toLocaleDateString() });
		}
		return null;
	};

	fetchLyrics = async () => {
		if (this.state.kara) {
			let response = await commandBackend('getKaraLyrics', { kid: (this.state.kara as DBPLCInfo).kid });
			if (response?.length > 0) {
				response = formatLyrics(response);
			}
			this.setState({ lyrics: response?.map(value => value.text) || [] });
		}
	};

	getInlineTag = (e: DBKaraTag, tagType: number) => {
		return <InlineTag
			key={e.tid}
			scope={this.props.scope}
			tag={e}
			tagType={tagType}
			className={e.problematic ? 'problematicTag' : 'inlineTag'}
			changeView={this.props.changeView}
		/>;
	};

	onClick = () => {
		closeModal(this.context.globalDispatch);
	}

	makeFavorite = () => {
		this.state.isFavorite ?
			commandBackend('deleteFavorites', {
				kids: [this.props.kid]
			}) :
			commandBackend('addFavorites', {
				kids: [this.props.kid]
			});
		this.setState({ isFavorite: !this.state.isFavorite });
	};

	addKara = async () => {
		const response = await commandBackend('addKaraToPublicPlaylist', {
			requestedby: this.context.globalState.auth.data.username,
			kid: this.props.kid
		});
		if (response && response.code && response.data?.plc && response.data?.plc.time_before_play > 0) {
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
	}

	compareTag = (a: DBKaraTag, b: DBKaraTag) => {
		return a.name.localeCompare(b.name);
	}

	placeHeader = (headerEl: ReactNode) => createPortal(headerEl, document.getElementById('menu-supp-root'));

	render() {
		if (this.state.kara) {
			const data = this.state.kara;

			// Tags in the header
			const karaTags = [];

			if (data.langs) {
				const isMulti = data.langs.find(e => e.name.indexOf('mul') > -1);
				isMulti ? karaTags.push(<div key={isMulti.tid} className="tag">
					{this.getInlineTag(isMulti, tagTypes.LANGS.type)}
				</div>) : karaTags.push(...data.langs.sort(this.compareTag).map(tag => {
					return <div key={tag.tid} className="tag green" title={tag.short ? tag.short : tag.name}>
						{this.getInlineTag(tag, tagTypes.LANGS.type)}
					</div>;
				}));
			}
			if (data.songtypes) {
				karaTags.push(...data.songtypes.sort(this.compareTag).map(tag => {
					return <div key={tag.tid} className="tag green" title={tag.short ? tag.short : tag.name}>
						{this.getInlineTag(tag, tagTypes.SONGTYPES.type)}{data.songorder > 0 ? ' ' + data.songorder : ''}
					</div>;
				}));
			}
			for (const type of ['VERSIONS', 'FAMILIES', 'PLATFORMS', 'GENRES', 'ORIGINS', 'GROUPS', 'MISC']) {
				const tagData = tagTypes[type];
				if (data[tagData.karajson]) {
					karaTags.push(...data[tagData.karajson].sort(this.compareTag).map(tag => {
						return <div key={tag.tid} className={`tag ${tagData.color}`} title={tag.short ? tag.short : tag.name}>
							{this.getInlineTag(tag, tagData.type)}
						</div>;
					}));
				}
			}

			// Tags in the page/modal itself (singers, songwriters, creators, karaoke authors)
			const karaBlockTags = [];
			for (const type of ['SINGERS', 'SONGWRITERS', 'CREATORS', 'AUTHORS']) {
				let key = 0;
				const tagData = tagTypes[type];
				if (data[tagData.karajson].length > 0) {
					karaBlockTags.push(<div className={`detailsKaraLine colored ${tagData.color}`} key={tagData.karajson}>
						<i className={`fas fa-fw fa-${tagData.icon}`} />
						<div>
							{i18next.t(`KARA.${type}_BY`)}
							<span key={`${type}${key}`} className="detailsKaraLineContent"> {data[tagData.karajson]
								.map(e => this.getInlineTag(e, tagData.type)).reduce((acc, x, index, arr): any => acc === null ? [x] : [acc, (index + 1 === arr.length) ?
									<span key={`${type}${key}`} className={`colored ${tagData.color}`}> {i18next.t('AND')} </span> :
									<span key={`${type}${key}`} className={`colored ${tagData.color}`}>, </span>, x], null)}</span>
						</div>
					</div>);
					key++;
				}
			}

			const playTime = data.time_before_play > 0 ? new Date(Date.now() + data.time_before_play * 1000): null;
			const details = (
				<React.Fragment>
					<div className="detailsKaraLine timeData">
						<span>
							<i className="fas fa-fw fa-clock" />
							{secondsTimeSpanToHMS(data.duration, 'mm:ss')}
						</span>
						<span>
							{playTime
								? i18next.t('DETAILS_PLAYING_IN', {
									time: secondsTimeSpanToHMS(data.time_before_play, 'hm'),
									date: playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2)
								})
								: (data.lastplayed_ago
									? this.getLastPlayed(data.lastplayed_at, data.lastplayed_ago)
									: '')
							}
						</span>
					</div>
					{data.upvotes && this.props.scope === 'admin' ?
						<div className="detailsKaraLine">
							<span
								title={i18next.t('UPVOTE_NUMBER')}>
								<i className="fas fa-thumbs-up" />
								{data.upvotes}
							</span>
						</div> : null
					}
					<div className="detailsKaraLine">
						<span>
							{this.props.playlistcontentId ? i18next.t('DETAILS_ADDED'):i18next.t('DETAILS_CREATED')}
							{data.created_at ? <>
								{i18next.t('DETAILS_ADDED_2')}
								<span className="boldDetails">{new Date(data.created_at).toLocaleString()}</span>
							</> : null
							}
							{data.nickname ? <>
								{i18next.t('DETAILS_ADDED_3')}
								<span className="boldDetails">{data.nickname}</span>
							</> : null
							}
						</span>
					</div>
					{karaBlockTags}
					<div className="detailsKaraLine">
						<span className="boldDetails">
							<i className={`fas fa-fw fa-${YEARS.icon}`} />
							{data.year}
						</span>
					</div>
				</React.Fragment>
			);

			const addKaraButton = (
				<button
					type="button"
					onClick={this.addKara}
					className="btn btn-action"
				>
					<i className="fas fa-fw fa-plus" />
					<span>{i18next.t('TOOLTIP_ADDKARA')}</span>
				</button>
			);

			const makeFavButton = (
				<button
					type="button"
					onClick={this.makeFavorite}
					className={`makeFav btn btn-action${this.state.isFavorite ? ' currentFav' : ''}`}
				>
					<i className="fas fa-fw fa-star" />
					<span>{this.state.isFavorite ? i18next.t('TOOLTIP_FAV_DEL') : i18next.t('TOOLTIP_FAV')}</span>
				</button>
			);

			const showVideoButton = (isRemote() && !/\./.test(data.repository)) ? null : (
				<button
					type="button"
					className="showVideo btn btn-action"
					onClick={() => this.setState({ showVideo: !this.state.showVideo })}
				>
					<i className="fas fa-fw fa-video" />
					<span>{this.state.showVideo ? i18next.t('TOOLTIP_HIDEVIDEO'):i18next.t('TOOLTIP_SHOWVIDEO')}</span>
				</button>
			);

			const video = this.state.showVideo ? (
				<video src={isRemote() ?
					`https://${data.repository}/downloads/medias/${data.mediafile}`:`/medias/${data.mediafile}`}
					   controls={true} autoPlay={true} loop={true} playsInline={true}
					   className={`modal-video${this.props.scope === 'public' ? ' public':''}`} />
			) : null;

			const lyricsKara = data.subfile ? (<div className="lyricsKara detailsKaraLine">
				{this.state.lyrics?.length > 0 ? <div className="boldDetails">
					<i className="fas fa-fw fa-closed-captioning" />
					{i18next.t('LYRICS')}
				</div> : null}
				{data.subfile && this.state.lyrics?.map((ligne, index) => {
					return (
						<React.Fragment key={index}>
							{ligne}
							<br />
						</React.Fragment>
					);
				})}
			</div>) : null;

			const header = (
				<div className={`modal-header img-background${this.props.scope === 'public' ? ' fixed' : ''}`} style={{ ['--img' as any]: this.props.scope === 'admin' ? `url('${getPreviewLink(data)}')` : 'none' }}>
					<div className="modal-header-title">
						{this.props.scope === 'public' ?
							<button
								className="transparent-btn"
								type="button" onClick={this.props.closeOnPublic}>
								<i className="fas fa-fw fa-arrow-left" />
							</button> : null}
						<div className="modal-title-block">
							<h4 className="modal-title">{data.title}</h4>
							<h5 className="modal-series">
								<InlineTag tag={data.series[0] || data.singers[0]}
									scope={this.props.scope}
									changeView={this.props.changeView}
									karaLang={data.langs[0].name}
									tagType={data.series[0] ? 1:2} />
							</h5>
						</div>
						{this.props.scope === 'admin' ?
							<button
								className="transparent-btn"
								type="button" onClick={this.closeModal}>
								<i className="fas fa-fw fa-times" />
							</button> : null}
					</div>
					<div className="tagConteneur">
						{karaTags}
					</div>
				</div>
			);

			let infoKaraTemp;
			if (this.props.scope === 'admin') {
				infoKaraTemp = (
					<div className="modal modalPage" onClick={this.onClickOutsideModal}>
						<div className="modal-dialog">
							<div className="modal-content">
								{header}
								<div className="detailsKara">
									<div className="centerButtons">
										{makeFavButton}
										{showVideoButton}
									</div>
									{video}
									{details}
									{lyricsKara}
								</div>
							</div>
						</div>
					</div>
				);
			} else {
				infoKaraTemp = (
					<React.Fragment>
						{this.placeHeader(header)}
						<div className="detailsKara">
							<div className="centerButtons">
								{this.context.globalState.auth.data.role === 'guest' ? null : makeFavButton}
								{
									this.state.kara?.public_plc_id?.length >= 1 ? null : addKaraButton
								}
								{showVideoButton}
							</div>
							{video}
							{details}
							{lyricsKara}
						</div>
					</React.Fragment>
				);
			}
			return infoKaraTemp;
		} else {
			return null;
		}
	}
}

export default KaraDetail;
