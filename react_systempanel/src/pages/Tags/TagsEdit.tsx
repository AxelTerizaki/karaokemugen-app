import React, {Component} from 'react';
import {Layout} from 'antd';
import TagsForm from './TagsForm';
import axios from 'axios/index';
import {connect} from 'react-redux';
import {push} from 'connected-react-router';
import {errorMessage, infoMessage, loading, warnMessage} from '../../actions/navigation';

import {ReduxMappedProps} from '../../react-app-env';

interface TagEditProps extends ReduxMappedProps {
	push: (string) => any,
	match?: any,
}

interface TagEditState {
	tag: any,
	save: any,
}

const newTag = {
	name: null,
	i18n: {}
};

class TagEdit extends Component<TagEditProps, TagEditState> {

	state = {
		tag: null,
		aliases: [],
		save: () => {}
	};

	componentDidMount() {
		this.loadTag();
	}

	saveNew = (tag) => {
		axios.post('/api/system/tags', tag)
			.then(() => {
				this.props.infoMessage('Tags successfully created');
				this.props.push('/system/tags');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	saveUpdate = (tag) => {
		axios.put(`/api/system/tags/${tag.tid}`, tag)
			.then(() => {
				this.props.infoMessage('Tags successfully edited');
				this.props.push('/system/tags');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	loadTag = () => {
		this.props.loading(true);
		if (this.props.match && this.props.match.params.tid) {
			axios.get(`/api/system/tags/${this.props.match.params.tid}`)
				.then(res => {
					const tagData = {...res.data};
					tagData.tid = this.props.match.params.tid;
					this.setState({tag: tagData, save: this.saveUpdate});
					this.props.loading(false);
				})
				.catch(err => {
					this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
					this.props.loading(false);
				});
		} else {
			this.setState({tag: {...newTag}, save: this.saveNew});
			this.props.loading(false);
		}
	};


	render() {
		return (
			<Layout.Content style={{padding: '25px 50px', textAlign: 'center'}}>
				{this.state.tag && (<TagsForm tag={this.state.tag} save={this.state.save} />)}
			</Layout.Content>
		);
	}
}

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	infoMessage: (message) => dispatch(infoMessage(message)),
	errorMessage: (message) => dispatch(errorMessage(message)),
	warnMessage: (message) => dispatch(warnMessage(message)),
	push: (url) => dispatch(push(url))
});

export default connect(mapStateToProps, mapDispatchToProps)(TagEdit);