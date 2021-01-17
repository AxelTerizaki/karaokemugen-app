import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { commandBackend } from '../../../utils/socket';

class RestartDownloadsModal extends Component<unknown, unknown> {

	closeModal = () => {
		sessionStorage.setItem('dlQueueRestart', 'true');
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	}

	deleteQueue = () => {
		commandBackend('deleteDownloads');
		this.closeModal();
	}

	startQueue = () => {
		commandBackend('startDownloadQueue');
		this.closeModal();
	}

	render() {
		return (
			<div className="modal modalPage">
				<div className="modal-dialog">
					<div className="modal-content">
						<ul className="modal-header">
							<h4 className="modal-title">{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.TITLE')}</h4>
							<button className="closeModal btn btn-action"
								onClick={this.closeModal}>
								<i className="fas fa-times"></i>
							</button>
						</ul>
						<div className="modal-body flex-direction-btns">
							<div>{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.LABEL')}</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={() => this.closeModal()}>
									<i className="fas fa-fw fa-clock fa-2x" />
									<div className="btn-large-container">
										<div className="title">{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.LATER')}</div>
									</div>
								</button>
							</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={() => this.deleteQueue()}>
									<i className="fas fa-fw fa-trash-alt fa-2x" />
									<div className="btn-large-container">
										<div className="title">{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.DELETE')}</div>
									</div>
								</button>
							</div>
							<div>
								<button className="btn btn-default"
									type="button" onClick={() => this.startQueue()}>
									<i className="fas fa-fw fa-download fa-2x" />
									<div className="btn-large-container">
										<div className="title">{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.CONTINUE')}</div>
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

export default RestartDownloadsModal;
