import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined,PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Checkbox, Divider, Layout, Table, Tooltip } from 'antd';
import i18next from 'i18next';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import { Repository } from '../../../../../src/lib/types/repo';
import { commandBackend } from '../../../utils/socket';

interface RepositoryListState {
	repositories: Array<Repository>,
	repository?: Repository
}

let timer: any;
class RepositoryList extends Component<unknown, RepositoryListState> {

	state = {
		repositories: []
	};

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		const res = await commandBackend('getRepos');
		this.setState({ repositories: res });
	}

	deleteRepository = async (repository: Repository) => {
		await commandBackend('deleteRepo', {name: repository.Name}, true);
		this.refresh();
	}

	move = async (index: number, change: number) => {
		const repositories = this.state.repositories;
		const firstRepos = repositories[index];
		const secondRepos = repositories[index + change];
		repositories[index + change] = firstRepos;
		repositories[index] = secondRepos;
		try {
			await commandBackend('updateSettings', {
				setting: { System: { Repositories: repositories } }
			});
			this.refresh();
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				commandBackend('generateDatabase', undefined, true, 300000).catch(() => {});
			}, 5000);
		} catch (e) {
			// already display
		}
	}

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.REPOSITORIES.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.REPOSITORIES.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Link to={'/system/repositories/new'}>
						<Button style={{ margin: '0.75em' }} type='primary'>
							{i18next.t('REPOSITORIES.NEW_REPOSITORY')}
							<PlusOutlined />
						</Button>
					</Link>
					<Table
						dataSource={this.state.repositories}
						columns={this.columns}
						rowKey='Name'
					/>
				</Layout.Content>
			</>
		);
	}

	columns = [{
		title: i18next.t('REPOSITORIES.NAME'),
		dataIndex: 'Name',
		key: 'name'
	}, {
		title: i18next.t('REPOSITORIES.BASE_DIR'),
		dataIndex: 'BaseDir',
		key: 'basedir'
	}, {
		title: i18next.t('REPOSITORIES.PATH_MEDIAS'),
		dataIndex: 'Path.Medias',
		key: 'path_medias',
		render: (_text, record: Repository) => (record.Path.Medias.map(item => {
			return <div className="pathFolders" key={item}>{item}</div>;
		}))
	}, {
		title: i18next.t('REPOSITORIES.ONLINE'),
		dataIndex: 'Online',
		key: 'online',
		render: (_text, record) => (<Checkbox disabled={true} checked={record.Online} />)
	}, {
		title: i18next.t('REPOSITORIES.ENABLED'),
		dataIndex: 'Enabled',
		key: 'enabled',
		render: (_text, record) => (<Checkbox disabled={true} checked={record.Enabled} />)
	}, {
		title: i18next.t('REPOSITORIES.SENDSTATS'),
		dataIndex: 'SendStats',
		key: 'sendStats',
		render: (_text, record) => (<Checkbox disabled={true} checked={record.SendStats} />)
	}, {
		title: i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS'),
		dataIndex: 'AutoMediaDownloads',
		key: 'autoMediaDownloads',
		render: (_text, record) => {
			if (record.AutoMediaDownloads === 'all') {
				return i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS_ALL');
			} else if (record.AutoMediaDownloads === 'updateOnly') {
				return i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS_UPDATE_ONLY');
			} else if (record.AutoMediaDownloads === 'none') {
				return i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS_NONE');
			}
		}
	}, {
		title: i18next.t('REPOSITORIES.MAINTAINER_MODE'),
		dataIndex: 'MaintainerMode',
		key: 'maintainerMode',
		render: (_text, record) => (<Checkbox disabled={true} checked={record.MaintainerMode} />)
	}, {
	}, {
		title: <span>{i18next.t('REPOSITORIES.MOVE')}&nbsp;
			<Tooltip title={i18next.t('REPOSITORIES.MOVE_TOOLTIP')}>
				<QuestionCircleOutlined />
			</Tooltip>
		</span>,
		key: 'move',
		render: (text, record, index) => {
			return (
				<React.Fragment>
					{index > 0 ?
						<Button type="default" icon={<ArrowUpOutlined />} onClick={() => this.move(index, -1)}></Button> : null}
					{index < this.state.repositories.length - 1 ?
						<Button type="default" icon={<ArrowDownOutlined />} onClick={() => this.move(index, +1)}></Button> : null}
				</React.Fragment>
			);
		}
	}, {
		title: i18next.t('ACTION'),
		key: 'action',
		render: (text, record: Repository) => (
			<span>
				<Link to={`/system/repositories/${record.Name}`}><Button type="primary" icon={<EditOutlined />} /></Link>
				{this.state.repositories.length > 1 ?
					<React.Fragment>
						<Divider type="vertical" />
						<Button type="primary" danger icon={<DeleteOutlined />}
							onClick={() => this.deleteRepository(record)}></Button>
					</React.Fragment> : null
				}
			</span>
		)
	}];
}

export default RepositoryList;
