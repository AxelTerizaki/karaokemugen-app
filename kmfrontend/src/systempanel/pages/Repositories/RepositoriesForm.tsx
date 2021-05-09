import { QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Divider, Form, Input, Select, Tooltip } from 'antd';
import { FormInstance } from 'antd/lib/form';
import i18next from 'i18next';
import React, { Component } from 'react';

import { Repository } from '../../../../../src/lib/types/repo';
import { TaskItem } from '../../../../../src/lib/types/taskItem';
import { commandBackend, getSocket } from '../../../utils/socket';
import FoldersElement from '../../components/FoldersElement';

interface RepositoriesFormProps {
	repository: Repository;
	save: any;
	consolidate: (consolidatePath: string) => void;
	compareLyrics: (repo: string) => void;
	copyLyrics: (report: string) => void;
}

interface RepositoriesFormState {
	consolidatePath?: string;
	compareRepo?: string;
	repositoriesValue: string[];
	gitUpdateInProgress: boolean
}

class RepositoryForm extends Component<RepositoriesFormProps, RepositoriesFormState> {
	formRef = React.createRef<FormInstance>();
	timeout: NodeJS.Timeout

	constructor(props) {
		super(props);
		if (props.repository) {
			this.getRepositories();
		}

		this.state = {
			consolidatePath: undefined,
			repositoriesValue: null,
			gitUpdateInProgress: false
		};
	}

	componentDidMount() {
		getSocket().on('tasksUpdated', this.isGitUpdateInProgress);
	}

	componentWillUnmount() {
		getSocket().off('tasksUpdated', this.isGitUpdateInProgress);
	}

	isGitUpdateInProgress = (tasks: Array<TaskItem>) => {
		for (const i in tasks) {
			if (tasks[i].text === 'UPDATING_GIT_REPO') {
				this.setState({ gitUpdateInProgress: true });
				clearTimeout(this.timeout);
				this.timeout = setTimeout(() => {
					this.setState({ gitUpdateInProgress: false });
				}, 5000);
			}
		}
	}

	getRepositories = async () => {
		const res = await commandBackend('getRepos');
		this.setState({ repositoriesValue: res.filter(repo => repo.Name !== this.props.repository.Name).map(repo => repo.Name) });
	};

	handleSubmit = (values) => {
		const repository: Repository = {
			Name: values.Name,
			Online: values.Online,
			Enabled: values.Enabled,
			SendStats: values.SendStats,
			Git: values.Git,
			BaseDir: values.BaseDir,
			AutoMediaDownloads: values.AutoMediaDownloads,
			MaintainerMode: values.MaintainerMode,
			Path: {
				Medias: values.PathMedias,
			}
		};
		this.props.save(repository);
	};

	setDefaultFolders = (): void => {
		if (!this.props.repository.Name) {
			const folders: {PathMedias?: string[], BaseDir?: string } = {};
			if (this.formRef.current?.getFieldValue('BaseDir')?.length === 0) folders.BaseDir = `repo/${this.formRef.current?.getFieldValue('Name')}/git`;
			if (this.formRef.current?.getFieldValue('PathMedias')?.length === 0) folders.PathMedias = [`repo/${this.formRef.current?.getFieldValue('Name')}/medias`];
			this.formRef.current?.setFieldsValue(folders);
		}
	}

	render() {
		return (
			<Form
				ref={this.formRef}
				onFinish={this.handleSubmit}
				className='repository-form'
				initialValues={{
					Name: this.props.repository?.Name,
					Online: this.props.repository?.Online,
					Enabled: this.props.repository?.Enabled,
					SendStats: this.props.repository?.SendStats,
					AutoMediaDownloads: this.props.repository?.AutoMediaDownloads,
					MaintainerMode: this.props.repository?.MaintainerMode,
					Git: this.props.repository?.Git,
					BaseDir: this.props.repository?.BaseDir,
					PathMedias: this.props.repository?.Path.Medias,
				}}
				style={{ maxWidth: '900px' }}
			>
				<Form.Item hasFeedback
					label={
						<span>{i18next.t(this.formRef.current?.getFieldValue('Online') ?
							'REPOSITORIES.ONLINE_NAME' : 'REPOSITORIES.NAME')}&nbsp;
						<Tooltip title={i18next.t('REPOSITORIES.TOOLTIP_NAME')}>
							<QuestionCircleOutlined />
						</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					rules={[{
						required: true,
						message: i18next.t('TAGS.NAME_REQUIRED')
					}]}
					name="Name"
				>
					<Input
						placeholder={i18next.t('REPOSITORIES.NAME')}
						onBlur={this.setDefaultFolders}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.ONLINE')}
					labelCol={{ flex: '0 1 300px' }}
					valuePropName="checked"
					name="Online"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.ENABLED')}
					labelCol={{ flex: '0 1 300px' }}
					valuePropName="checked"
					name="Enabled"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={
						<span>{i18next.t('REPOSITORIES.SENDSTATS')}&nbsp;
							<Tooltip title={i18next.t('REPOSITORIES.SENDSTATS_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					valuePropName="checked"
					name="SendStats"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={
						<span>{i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS')}&nbsp;
							<Tooltip title={i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					valuePropName="checked"
					name="AutoMediaDownloads"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={
						<span>{i18next.t('REPOSITORIES.MAINTAINER_MODE')}&nbsp;
							<Tooltip title={i18next.t('REPOSITORIES.MAINTAINER_MODE_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					valuePropName="checked"
					name="MaintainerMode"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.BASE_DIR')}
					labelCol={{ flex: '0 1 300px' }}
					rules={[{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', { name: i18next.t('REPOSITORIES.BASE_DIR') })
					}]}
					name="BaseDir"
				>
					<FoldersElement openDirectory={true} onChange={(value) => this.formRef.current?.setFieldsValue({ 'BaseDir': value })} />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_MEDIAS')}
					labelCol={{ flex: '0 1 300px' }}
					rules={[{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', { name: i18next.t('REPOSITORIES.PATH_MEDIAS') })
					}]}
					name="PathMedias"
				>
					<FoldersElement openDirectory={true} onChange={(value) => this.formRef.current?.setFieldsValue({ 'PathMedias': value })} />
				</Form.Item>
				<Form.Item style={{ textAlign: 'right' }}>
					<Button
						type='primary'
						htmlType='submit'
						disabled={this.state.gitUpdateInProgress}
					>
						{i18next.t('SUBMIT')}
					</Button>
				</Form.Item>
				{this.props.repository.Name ?
					<React.Fragment>
						<Divider orientation="left">{i18next.t('REPOSITORIES.COMPARE_LYRICS')}</Divider>
						<Alert style={{ textAlign: 'left', marginBottom: '10px' }}
							message={i18next.t('REPOSITORIES.COMPARE_ABOUT_MESSAGE')}
							type="info"
						/>
						{this.state.repositoriesValue ?
							<React.Fragment>
								<Form.Item
									label={i18next.t('REPOSITORIES.COMPARE_LYRICS_CHOOSE_REPOSITORY')}
									labelCol={{ flex: '0 1 300px' }}
								>

									<Select style={{ maxWidth: '50%', minWidth: '150px' }} placeholder={i18next.t('TAGS.REPOSITORY')}
										onChange={value => this.setState({ compareRepo: value.toString() })}>
										{this.state.repositoriesValue.map(repo => {
											return <Select.Option key={repo} value={repo}>{repo}</Select.Option>;
										})
										}
									</Select>
								</Form.Item>
								<Form.Item
									labelCol={{ flex: '0 1 300px' }}
									style={{ textAlign: 'right' }}>
									<div>
										<Button
											type='primary'
											disabled={this.state.gitUpdateInProgress}
											onClick={() => this.props.compareLyrics(this.state.compareRepo)}
										>
											{i18next.t('REPOSITORIES.COMPARE_BUTTON')}
										</Button>
									</div>
								</Form.Item>
							</React.Fragment>
							: null
						}
						<Divider orientation="left">{i18next.t('REPOSITORIES.CONSOLIDATE_PANEL')}</Divider>

						<Form.Item hasFeedback
							label={i18next.t('REPOSITORIES.CONSOLIDATE')}
							labelCol={{ flex: '0 1 300px' }}
						>
							<FoldersElement
								openDirectory={true}
								onChange={(value) => this.setState({ consolidatePath: value })}
							/>
						</Form.Item>
						<Form.Item
							style={{ textAlign: 'right' }}
						>
							<Button
								type="primary"
								danger
								disabled={this.state.gitUpdateInProgress}
								onClick={() => this.props.consolidate(this.state.consolidatePath)}
							>
								{i18next.t('REPOSITORIES.CONSOLIDATE_BUTTON')}
							</Button>
							<Alert style={{ textAlign: 'left', marginTop: '10px' }}
								message={i18next.t('REPOSITORIES.WARNING')}
								description={i18next.t('REPOSITORIES.CONSOLIDATE_ABOUT_MESSAGE')}
								type="warning"
							/>

						</Form.Item>
					</React.Fragment> : null
				}
			</Form>
		);
	}
}

export default RepositoryForm;
