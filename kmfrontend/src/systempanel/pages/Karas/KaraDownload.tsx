import { CheckCircleTwoTone, ClockCircleTwoTone, DownloadOutlined, InfoCircleTwoTone, SyncOutlined, WarningTwoTone } from '@ant-design/icons';
import { Button, Cascader, Col, Input, Layout, Radio, Row, Select, Table } from 'antd';
import i18next from 'i18next';
import prettyBytes from 'pretty-bytes';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import { DBKara, DBKaraTag } from '../../../../../src/lib/types/database/kara';
import { DBTag } from '../../../../../src/lib/types/database/tag';
import { DBDownload } from '../../../../../src/types/database/download';
import { KaraDownloadRequest } from '../../../../../src/types/download';
import GlobalContext from '../../../store/context';
import { getSerieLanguage, getTagInLocale, getTagInLocaleList } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
interface KaraDownloadState {
	karas: DBKara[];
	i18nTag: any;
	karasCount: number;
	karasQueue: DBDownload[];
	currentPage: number;
	currentPageSize: number;
	filter: string;
	tagFilter: string;
	tags: DBTag[];
	download_status: 'MISSING' | 'DOWNLOADING' | '';
	totalMediaSize: string;
	tagOptions: any[];
	preview: string;
}

class KaraDownload extends Component<unknown, KaraDownloadState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props) {
		super(props);
		this.state = {
			karas: [],
			i18nTag: {},
			karasCount: 0,
			karasQueue: [],
			currentPage: parseInt(localStorage.getItem('karaDownloadPage')) || 1,
			currentPageSize: parseInt(localStorage.getItem('karaDownloadPageSize')) || 100,
			filter: localStorage.getItem('karaDownloadFilter') || '',
			tagFilter: '',
			tags: [],
			download_status: 'MISSING',
			totalMediaSize: '',
			tagOptions: [],
			preview: ''
		};
	}

	componentDidMount() {
		this.getKaras();
		this.getTotalMediaSize();
		this.readKaraQueue();
		this.getTags();
		getSocket().on('downloadQueueStatus', this.downloadQueueStatus);
	}

	componentWillUnmount() {
		getSocket().off('downloadQueueStatus', this.downloadQueueStatus);
	}

	downloadQueueStatus = (data?: any) => {
		this.setState({ karasQueue: data });
	}

	async getTags() {
		try {
			const res = await commandBackend('getTags', undefined, false, 300000);
			this.setState({ tags: res.content }, () => this.filterTagCascaderOption());
		} catch (e) {
			// already display
		}
	}

	changeFilter = (event) => {
		this.setState({ filter: event.target.value, currentPage: 0 }, () => {
			localStorage.setItem('karaDownloadFilter', this.state.filter);
		});
	}

	downloadKara = (kara) => {
		const downloadObject: KaraDownloadRequest = {
			mediafile: kara.mediafile,
			kid: kara.kid,
			size: kara.mediasize,
			name: kara.name,
			repository: kara.repository
		};
		this.postToDownloadQueue([downloadObject]);
	}

	downloadAll = async () => {
		const p = Math.max(0, this.state.currentPage - 1);
		const psz = this.state.currentPageSize;
		const pfrom = p * psz;
		const response = await commandBackend('getKaras', {
			filter: this.state.filter,
			q: `${this.state.tagFilter}!m:${this.state.download_status}`,
			from: pfrom,
			size: psz
		}, false, 300000);
		const karas = response.content;
		const karasToDownload: KaraDownloadRequest[] = [];
		for (const kara of karas) {
			karasToDownload.push({
				mediafile: kara.mediafile,
				kid: kara.kid,
				size: kara.mediasize,
				name: kara.karafile.replace('.kara.json', ''),
				repository: kara.repository
			});
		}
		this.postToDownloadQueue(karasToDownload);
	}

	getKaras = async () => {
		try {
			const p = Math.max(0, this.state.currentPage - 1);
			const psz = this.state.currentPageSize;
			const pfrom = p * psz;
			const res = await commandBackend('getKaras', {
				filter: this.state.filter,
				q: `${this.state.tagFilter}!m:${this.state.download_status}`,
				from: pfrom,
				size: psz
			}, false, 300000);
			this.setState({
				karas: res.content,
				karasCount: res.infos.count || 0,
				i18nTag: res.i18n
			});
		} catch (e) {
			// already display
		}
	}

	getTotalMediaSize = async () => {
		try {
			const res = await commandBackend('getKaras', undefined, false, 300000);
			const totalMediaSize = res.content.reduce((accumulator, currentValue) => accumulator + currentValue.mediasize, 0);
			this.setState({ totalMediaSize: prettyBytes(totalMediaSize) });
		} catch (e) {
			// already display
		}
	}

	readKaraQueue = async () => {
		const res = await commandBackend('getDownloads', undefined, false, 300000);
		this.setState({ karasQueue: res });
	}

	handleTableChange = (pagination) => {
		this.setState({
			currentPage: pagination.current,
			currentPageSize: pagination.pageSize,
		});
		localStorage.setItem('karaDownloadPage', pagination.current);
		localStorage.setItem('karaDownloadPageSize', pagination.pageSize);
		setTimeout(this.getKaras, 10);
	};

	handleFilterTagSelection = (value) => {
		let t = '';
		if (value && value[1])
			t = 't:' + value[1] + '~' + value[0];

		this.setState({ tagFilter: t, currentPage: 0 }, () => {
			localStorage.setItem('karaDownloadPage', '0');
			localStorage.setItem('karaDownloadtagFilter', this.state.tagFilter);
			setTimeout(this.getKaras, 10);
		});
	}

	filterTagCascaderOption = () => {
		const options = Object.keys(tagTypes).map(type => {
			const typeID = tagTypes[type].type;

			const option = {
				value: typeID,
				label: i18next.t(`TAG_TYPES.${type}`),
				children: []
			};
			for (const tag of this.state.tags.filter(tag => tag.types.length && tag.types.indexOf(typeID) >= 0)) {
				option.children.push({
					value: tag.tid,
					label: getTagInLocale(tag as unknown as DBKaraTag),
				});
			}
			return option;
		});
		this.setState({ tagOptions: options });
	}

	getGroupsTags = () => {
		return this.state.tags.filter((tag, index, self) =>
			tag.types.includes(tagTypes.GROUPS.type) && index === self.findIndex((t) => (
				t.tid === tag.tid
			))
		).map(tag => {
			return {
				value: tag.tid,
				label: tag.name,
			};
		});
	}

	FilterTagCascaderFilter = function (inputValue, path) {
		return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
	}

	// START karas download queue
	putToDownloadQueueStart = () => {
		commandBackend('startDownloadQueue').catch(() => { });
	}

	// PAUSE karas download queue
	putToDownloadQueuePause = () => {
		commandBackend('pauseDownloads').catch(() => { });
	}

	// POST (add) items to download queue
	postToDownloadQueue = (downloads: KaraDownloadRequest[]) => {
		commandBackend('addDownloads', {
			downloads
		}).catch(() => { });
	}

	isLocalKara = (kara) => {
		const karaLocal = this.state.karas.find(item => item.kid === kara.kid);
		return karaLocal.download_status === 'DOWNLOADED';
	}

	isQueuedKara = (kara) => {
		return this.state.karasQueue.find(item => item.name === kara.name);
	}

	showPreview = (kara) => {
		this.setState({ preview: `https://${kara.repository}/downloads/medias/${encodeURIComponent(kara.mediafile)}` });
		document.addEventListener('keyup', this.closeVideo);
	}

	closeVideo = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			this.setState({ preview: undefined });
			document.removeEventListener('keyup', this.closeVideo);
		}
	};

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.DOWNLOAD.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.DOWNLOAD.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Row justify="space-between">
						<Col flex={3} style={{ marginRight: '10px' }}>
							<Row>
								<Input.Search
									placeholder={i18next.t('SEARCH_FILTER')}
									value={this.state.filter}
									onChange={event => this.changeFilter(event)}
									enterButton={i18next.t('SEARCH')}
									onSearch={this.getKaras}
								/>
							</Row>
							<Row style={{ margin: '0.5em' }}>
								<label>{i18next.t('KARA.TOTAL_MEDIA_SIZE')} {this.state.totalMediaSize}</label>
							</Row>
							<Row>
								<Button style={{ width: '230px' }} type="primary" key="synchronize"
									onClick={() => commandBackend('updateAllMedias').catch(() => { })}>{i18next.t('KARA.SYNCHRONIZE')}</Button>
								&nbsp;
								{i18next.t('KARA.SYNCHRONIZE_DESC')}
							</Row>
							<Row>
								<label style={{ margin: '0.5em' }}>{i18next.t('KARA.FILTER_MEDIA_STATUS')}</label>
								<Radio
									style={{ margin: '0.5em' }}
									checked={this.state.download_status === ''}
									onChange={() => this.setState({ download_status: '', currentPage: 0 }, this.getKaras)}
								>
									{i18next.t('KARA.FILTER_ALL')}
								</Radio>
								<Radio
									style={{ margin: '0.5em' }}
									checked={this.state.download_status === 'DOWNLOADING'}
									onChange={() => this.setState({ download_status: 'DOWNLOADING', currentPage: 0 }, this.getKaras)}
								>
									{i18next.t('KARA.FILTER_IN_PROGRESS')}
								</Radio>
								<Radio
									style={{ margin: '0.5em' }}
									checked={this.state.download_status === 'MISSING'}
									onChange={() => this.setState({ download_status: 'MISSING', currentPage: 0 }, this.getKaras)}
								>
									{i18next.t('KARA.FILTER_NOT_DOWNLOADED')}
								</Radio>
							</Row>
						</Col>
						<Col flex={2}>
							<Row>
								<Cascader style={{ width: '90%' }} options={this.state.tagOptions}
									showSearch={{ filter: this.FilterTagCascaderFilter, matchInputWidth: false }}
									onChange={this.handleFilterTagSelection} placeholder={i18next.t('KARA.TAG_FILTER')} />
							</Row>
							<Row style={{ marginTop: '1.5em' }}>
								<Select allowClear style={{ width: '90%' }} onChange={(value) => this.handleFilterTagSelection([tagTypes.GROUPS, value])}
									placeholder={i18next.t('KARA.TAG_GROUP_FILTER')} key={'tid'} options={this.getGroupsTags()} />
							</Row>
						</Col>
						<Col flex={2}>
							<Row>
								<label>{i18next.t('KARA.QUEUE_LABEL')}</label>
							</Row>
							<Row>
								<label>{i18next.t('KARA.QUEUE_LABEL_SONGS', {
									numberSongs: this.state.karasQueue.filter(kara => kara.status !== 'DL_DONE'
										&& kara.status !== 'DL_FAILED').length
								})}</label>
							</Row>
							<Row>
								<Col style={{ margin: '0.5em' }}>
									<Link to='/system/karas/download/queue'>
										<Button style={{ width: '100px' }} type="primary" key="queueView">
											{i18next.t('KARA.VIEW_DOWNLOAD_QUEUE')}
										</Button>
									</Link>
								</Col>
								<Col style={{ margin: '0.5em' }}>
									<Button style={{ width: '100px' }} type="primary" key="queueDelete"
										onClick={() => commandBackend('deleteDownloads').catch(() => { })}>{i18next.t('KARA.WIPE_DOWNLOAD_QUEUE')}</Button>
								</Col>
							</Row>
							<Row>
								<Col style={{ margin: '0.5em' }}>
									<Button style={{ width: '100px' }} type="primary" key="queueStart"
										onClick={this.putToDownloadQueueStart}>{i18next.t('KARA.START_DOWNLOAD_QUEUE')}</Button>
								</Col>
								<Col style={{ margin: '0.5em' }}>
									<Button style={{ width: '100px' }} type="primary" key="queuePause"
										onClick={this.putToDownloadQueuePause}>{i18next.t('KARA.PAUSE_DOWNLOAD_QUEUE')}</Button>
								</Col>
							</Row>
						</Col>
					</Row>
					<Table
						onChange={this.handleTableChange}
						dataSource={this.state.karas}
						columns={this.columns}
						rowKey='kid'
						pagination={{
							position: ['topRight', 'bottomRight'],
							current: this.state.currentPage || 1,
							defaultPageSize: this.state.currentPageSize,
							pageSize: this.state.currentPageSize,
							pageSizeOptions: ['10', '25', '50', '100', '500'],
							showTotal: (total, range) => {
								const to = range[1];
								const from = range[0];
								return i18next.t('KARA.SHOWING', { from: from, to: to, total: total });
							},
							total: this.state.karasCount,
							showQuickJumper: true,
						}}
					/>
				</Layout.Content>
				{this.state.preview ?
					<div className="overlay" onClick={() => {
						this.setState({ preview: undefined });
						document.removeEventListener('keyup', this.closeVideo);
					}}>
						<video id="video" autoPlay src={this.state.preview} />
					</div> : null
				}
			</>
		);
	}

	columns = [
		{
			title: i18next.t('KARA.LANGUAGES'),
			dataIndex: 'langs',
			key: 'langs',
			render: langs => {
				return getTagInLocaleList(langs, this.state.i18nTag).join(', ');
			}
		}, {
			title: `${i18next.t('KARA.SERIES')} / ${i18next.t('KARA.SINGERS_BY')}`,
			dataIndex: 'series',
			key: 'series',
			render: (series, record) => {
				return (series && series.length > 0) ?
					series.map(serie => getSerieLanguage(this.context.globalState.settings.data, serie, record.langs[0].name, this.state.i18nTag)).join(', ')
					: getTagInLocaleList(record.singers, this.state.i18nTag).join(', ');
			}
		}, {
			title: i18next.t('KARA.SONGTYPES'),
			dataIndex: 'songtypes',
			key: 'songtypes',
			render: (songtypes, record) => {
				const songorder = record.songorder || '';
				return getTagInLocaleList(songtypes, this.state.i18nTag).sort().join(', ') + ' ' + songorder || '';
			}
		}, {
			title: i18next.t('KARA.FAMILIES'),
			dataIndex: 'families',
			key: 'families',
			render: (families) => {
				return getTagInLocaleList(families, this.state.i18nTag).join(', ');
			}
		}, {
			title: i18next.t('KARA.TITLE'),
			dataIndex: 'title',
			key: 'title',
			render: (title) => {
				return <span>{title}</span>;
			}
		}, {
			title: i18next.t('TAG_TYPES.VERSIONS', { count: 2 }),
			dataIndex: 'versions',
			key: 'versions',
			render: (versions) => getTagInLocaleList(versions, this.state.i18nTag).join(', ')
		}, {
			title: i18next.t('KARA.REPOSITORY'),
			dataIndex: 'repository',
			key: 'repository',
		}, {
			title: i18next.t('KARA.VIDEO_PREVIEW'),
			key: 'preview',
			render: (_text, record) => {
				return <Button type="default" onClick={() => this.showPreview(record)}><InfoCircleTwoTone /></Button>;
			}
		}, {
			title: <span><Button title={i18next.t('KARA.DOWNLOAD_ALL_TOOLTIP')} type="default"
				onClick={this.downloadAll}><DownloadOutlined /></Button>{i18next.t('KARA.DOWNLOAD')}
			</span>,
			key: 'download',
			render: (_text, record) => {
				let button = null;
				if (this.isLocalKara(record)) {
					button = <Button disabled type="default"><CheckCircleTwoTone twoToneColor="#52c41a" /></Button>;
				} else {
					const queue = this.isQueuedKara(record);
					if (queue) {
						if (queue.status === 'DL_RUNNING') {
							button = <span><Button disabled type="default"><SyncOutlined spin /></Button></span>;
						} else if (queue.status === 'DL_PLANNED') {
							button = <Button disabled type="default">
								<ClockCircleTwoTone twoToneColor="#dc4e41" />
							</Button>;
						} else if (queue.status === 'DL_DONE') {
							button = <Button disabled type="default"><CheckCircleTwoTone twoToneColor="#52c41a" /></Button>;
						} else if (queue.status === 'DL_FAILED') {
							button = <span><Button type="default" onClick={() => this.downloadKara(record)}><WarningTwoTone twoToneColor="#f24848" /></Button></span>;
						}
					} else {
						button = <Button type="default" onClick={() => this.downloadKara(record)}><DownloadOutlined /></Button>;
					}
				}
				return <span style={{ whiteSpace: 'nowrap' }}>{button} {prettyBytes(Number(record.mediasize))}</span>;
			}
		}];
}

export default KaraDownload;
