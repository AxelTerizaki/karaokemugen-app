import { DeleteOutlined, EditOutlined,FileExcelOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Checkbox,Divider, Layout, Modal, Table } from 'antd';
import i18next from 'i18next';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import { Session, SessionExports } from '../../../../../src/types/session';
import { commandBackend } from '../../../utils/socket';

interface SessionListState {
	sessions: Array<Session>,
	session?: Session
}

class SessionList extends Component<unknown, SessionListState> {

	state = {
		sessions: []
	};

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		const res = await commandBackend('getSessions');
		this.setState({ sessions: res });
	}

	deleteSession = async (session) => {
		await commandBackend('deleteSession', {seid: session.seid});
		this.refresh();
	}

	exportSession = async (session) => {
		const exportSession:SessionExports = await commandBackend('exportSession', {seid: session.seid});
		Modal.info({
			title: i18next.t('SESSIONS.SESSION_EXPORTED_TITLE'),
			content: <div>
				<div>{i18next.t('SESSIONS.SESSION_EXPORTED_DESC')}</div>
				<ul>
					<li><a href={`/sessionExports/${exportSession.played}`}>
						{i18next.t('SESSIONS.SESSION_EXPORT_PLAYED')}
					</a></li>
					<li><a href={`/sessionExports/${exportSession.playedCount}`}>
						{i18next.t('SESSIONS.SESSION_EXPORT_PLAYED_COUNT')}
					</a></li>
					<li><a href={`/sessionExports/${exportSession.requested}`}>
						{i18next.t('SESSIONS.SESSION_EXPORT_REQUESTED')}
					</a></li>
					<li><a href={`/sessionExports/${exportSession.requestedCount}`}>
						{i18next.t('SESSIONS.SESSION_EXPORT_REQUESTED_COUNT')}
					</a></li>
				</ul>
			</div>,
		  });
	}

	majPrivate = async (sessionParam: Session) => {
		const session = sessionParam;
		session.private = !sessionParam.private;
		await commandBackend('editSession', session);
		this.refresh();
	};

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.SESSIONS.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.SESSIONS.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Link to={'/system/km/sessions/new'}>
						<Button style={{ margin: '0.75em' }} type='primary'>
							{i18next.t('SESSIONS.NEW_SESSION')}
							<PlusOutlined />
						</Button>
					</Link>
					<Table
						dataSource={this.state.sessions}
						columns={this.columns}
						rowKey='seid'
					/>
				</Layout.Content>
			</>
		);
	}

	columns = [{
		title: i18next.t('SESSIONS.NAME'),
		dataIndex: 'name',
		key: 'name',
		sorter: (a,b) => a.name - b.name
	}, {
		title: i18next.t('SESSIONS.STARTED_AT'),
		dataIndex: 'started_at',
		key: 'started_at',
		render: (date) => (new Date(date)).toLocaleString(),
		sorter: (a,b) => a.started_at - b.started_at
	}, {
		title: i18next.t('SESSIONS.ENDED_AT'),
		dataIndex: 'ended_at',
		key: 'ended_at',
		render: (date) => date ? (new Date(date)).toLocaleString() : null,
		sorter: (a,b) => a.ended_at - b.ended_at
	}, {
		title: i18next.t('SESSIONS.KARA_PLAYED'),
		dataIndex: 'played',
		key: 'played',
		sorter: (a,b) => a.played - b.played
	}, {
		title: i18next.t('SESSIONS.KARA_REQUESTED'),
		dataIndex: 'requested',
		key: 'requested',
		sorter: (a,b) => a.requested - b.requested
	}, {
		title: i18next.t('SESSIONS.ACTIVE'),
		dataIndex: 'active',
		key: 'active',
		render: (text, record) => (<span>
			{record.active ?
				i18next.t('YES') : null
			}
		</span>)
	}, {
		title: i18next.t('SESSIONS.PRIVATE'),
		dataIndex: 'private',
		key: 'private',
		render: (text, record) => (<Checkbox checked={record.private} onClick={() => this.majPrivate(record)} />)
	}, {
		title: i18next.t('SESSIONS.SESSION_EXPORTED_BUTTON'),
		key: 'export',
		render: (text, record) => {
			return <Button type="default" icon={<FileExcelOutlined />} onClick={() => this.exportSession(record)}></Button>;
		}
	}, {
		title: i18next.t('ACTION'),
		key: 'action',
		render: (text, record) => (
			<span>
				<Link to={`/system/km/sessions/${record.seid}`}><EditOutlined /></Link>
				{record.active ? '' :
					<React.Fragment>
						<Divider type="vertical" />
						<Button type="primary" danger icon={<DeleteOutlined />}
							onClick={() => this.deleteSession(record)}></Button>
					</React.Fragment>
				}
			</span>
		)
	}];
}

export default SessionList;
