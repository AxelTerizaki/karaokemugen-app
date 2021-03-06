import i18next from 'i18next';
import React, { Component } from 'react';

import { RemoteFailure, RemoteSuccess } from '../../../../../src/lib/types/remote';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { callModal } from '../../../utils/tools';

interface RemoteStatusInactive {
	active: false
}

interface RemoteStatusActive {
	active: true,
	info: RemoteSuccess | RemoteFailure,
	token: string
}

type RemoteStatusData = RemoteStatusInactive | RemoteStatusActive;

interface IState {
	remoteStatus?: RemoteStatusData
}

class RemoteStatus extends Component<unknown, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props) {
		super(props);
		this.state = {};
	}

	timeout: NodeJS.Timeout

	updateRemoteData = async () => {
		try {
			const data: RemoteStatusData = await commandBackend('getRemoteData');
			this.setState({ remoteStatus: data });
		} catch (e) {
			// already display
		}
	}

	reset = (e: any) => {
		e.preventDefault();
		callModal(this.context.globalDispatch, 'confirm', i18next.t('REMOTE_RESET'), i18next.t('REMOTE_RESET_CONFIRM'), () => {
			commandBackend('resetRemoteToken');
		});
	}

	componentDidMount() {
		this.updateRemoteData();
		this.timeout = setInterval(this.updateRemoteData, 500);
	}

	componentWillUnmount() {
		clearInterval(this.timeout);
	}

	render() {
		return (
			<div id="remoteInfoSettings"
					 className="settingsGroupPanel">
				{this.state.remoteStatus?.active ?
					('host' in this.state.remoteStatus.info ?
						<>
							<div className="settings-line">
								<label>
									{i18next.t('REMOTE_STATUS.LABEL')}
								</label>
								<div>
									{i18next.t('REMOTE_STATUS.CONNECTED')}
								</div>
							</div>
							<div className="settings-line">
								<label>
									{i18next.t('REMOTE_URL')}
								</label>
								<div>
									{this.state.remoteStatus.info.host}
								</div>
							</div>
							<div className="settings-line">
								<label>
									<span className="title">{i18next.t('REMOTE_TOKEN')}</span>
									<br />
									<span className="tooltip">{i18next.t('REMOTE_TOKEN_TOOLTIP')}</span>
								</label>
								<div>
									<span className="blur-hover">{this.state.remoteStatus.token}</span>
									<button className="btn btn-danger" onClick={this.reset} title={i18next.t('REMOTE_RESET_TOOLTIP')}>
										{i18next.t('REMOTE_RESET')}
									</button>
								</div>
							</div>
						</>
						:
						<>
							<div className="settings-line">
								<label>
									{i18next.t('REMOTE_STATUS.LABEL')}
								</label>
								<div>
									{this.state.remoteStatus.info.reason === 'OUTDATED_CLIENT' ? i18next.t('REMOTE_STATUS.OUTDATED_CLIENT'):null}
									{this.state.remoteStatus.info.reason === 'UNKNOWN_COMMAND' ? i18next.t('REMOTE_STATUS.OUTDATED'):null}
									{!['OUTDATED_CLIENT', 'UNKNOWN_COMMAND'].includes(this.state.remoteStatus.info.reason) ?
										<span>{i18next.t('REMOTE_STATUS.DISCONNECTED')} {this.state.remoteStatus.info.reason}</span>:null}
								</div>
							</div>
						</>
					)
					: <div className="settings-line">
						<label>
							<span className="title">{i18next.t('REMOTE_STATUS.LABEL')}</span>
						</label>
						<div>
							{i18next.t('REMOTE_STATUS.DISCONNECTED')}
						</div>
					</div>}
			</div>
		);
	}
}

export default RemoteStatus;
