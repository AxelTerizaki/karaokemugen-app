import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { commandBackend } from '../../../utils/socket';

interface IProps {
	idPlaylist: number;
	playlistWillUpdate: () => void;
	playlistDidUpdate: () => void;
}

class ShuffleModal extends Component<IProps, unknown> {

	shuffle = async (method: string) => {
		this.props.playlistWillUpdate();
		await commandBackend('shufflePlaylist', { pl_id: this.props.idPlaylist, method: method });
		this.props.playlistDidUpdate();
		this.closeModal();
	};

	closeModal = () => {
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	}

	render() {
		return (
			<div className="modal modalPage">
				<div className="modal-dialog">
					<div className="modal-content">
						<ul className="modal-header">
							<h4 className="modal-title">{i18next.t('MODAL.SHUFFLE_MODAL.TITLE')}</h4>
							<button className="closeModal btn btn-action"
								onClick={this.closeModal}>
								<i className="fas fa-times"></i>
							</button>
						</ul>
						<div className="modal-body shuffle-modal">
							<div>{i18next.t('MODAL.SHUFFLE_MODAL.LABEL')}</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={() => this.shuffle('normal')}>
									<i className="fas fa-fw fa-random fa-2x" />
									<div className="btn-large-container">
										<div className="title">{i18next.t('MODAL.SHUFFLE_MODAL.SHUFFLE')}</div>
										<div className="desc">{i18next.t('MODAL.SHUFFLE_MODAL.SHUFFLE_DESC')}</div>
									</div>
								</button>
							</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={() => this.shuffle('smart')}>
									<i className="fas fa-fw fa-lightbulb fa-2x" />
									<div className="btn-large-container">
										<div className="title">{i18next.t('MODAL.SHUFFLE_MODAL.SMART_SHUFFLE')}</div>
										<div className="desc">{i18next.t('MODAL.SHUFFLE_MODAL.SMART_SHUFFLE_DESC')}</div>
									</div>
								</button>
							</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={() => this.shuffle('balance')}>
									<i className="fas fa-fw fa-balance-scale fa-2x" />
									<div className="btn-large-container">
										<div className="title">{i18next.t('MODAL.SHUFFLE_MODAL.BALANCE')}</div>
										<div className="desc">{i18next.t('MODAL.SHUFFLE_MODAL.BALANCE_DESC')}</div>
									</div>
								</button>
							</div>
						</div >
					</div >
				</div >
			</div >
		);
	}
}

export default ShuffleModal;
