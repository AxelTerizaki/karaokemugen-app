import {Button, Layout, Table} from 'antd';
import i18next from 'i18next';
import React, {Component} from 'react';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../store/context';
import {getSerieLanguage,getTagInLocaleList} from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';

interface RankingState {
	karas: DBKara[];
	i18n: any[];
}

class Ranking extends Component<unknown, RankingState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>
	
	state = {
		karas: [],
		i18n: []
	};

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		try {
			const res = await commandBackend('getKaras', {order: 'requestedLocal'});
			this.setState({karas: res.content, i18n: res.i18n});
		} catch (e) {
			// already display
		}
	}

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.MOST_REQUESTED.TITLE')}</div>
					<div className='description'>
						{this.context.globalState.settings.data.config?.Online?.FetchPopularSongs ?
							i18next.t('HEADERS.MOST_REQUESTED.DESCRIPTION_ONLINE') : 
							i18next.t('HEADERS.MOST_REQUESTED.DESCRIPTION')
						}
					</div>
				</Layout.Header>
				<Layout.Content>
					<Button style={{margin: '1em'}} type='primary' onClick={this.refresh}>{i18next.t('REFRESH')}</Button>
					<Table
						dataSource={this.state.karas}
						columns={this.columns}
						rowKey='requested'
					/>
				</Layout.Content>
			</>
		);
	}

	columns = [{
		title: i18next.t('KARA.LANGUAGES'),
		dataIndex: 'langs',
		key: 'langs',
		render: langs => getTagInLocaleList(langs, this.state.i18n).join(', ')
	}, {
		title: `${i18next.t('KARA.SERIES')} / ${i18next.t('KARA.SINGERS_BY')}`,
		dataIndex: 'series',
		key: 'series',
		render: (series, record) => (series && series.length > 0) ?
			series.map(serie => getSerieLanguage(this.context.globalState.settings.data, serie, record.langs[0].name, this.state.i18n)).join(', ')
			: getTagInLocaleList(record.singers, this.state.i18n).join(', ')
	}, {
		title: i18next.t('KARA.SONGTYPES'),
		dataIndex: 'songtypes',
		key: 'songtypes',
		render: (songtypes, record) => getTagInLocaleList(songtypes, this.state.i18n).sort().join(', ') + ' ' + (record.songorder || '')
	}, {
		title: i18next.t('KARA.TITLE'),
		dataIndex: 'title',
		key: 'title'
	}, {
		title: i18next.t('TAG_TYPES.VERSIONS', {count : 2}),
		dataIndex: 'versions',
		key: 'versions',
		render: (versions) => getTagInLocaleList(versions, this.state.i18n).join(', ')
	}, {
		title: i18next.t('KARA.REQUESTED'),
		dataIndex: 'requested',
		key: 'requested',
		render: requested => requested,
	}];
}

export default Ranking;
