import { LockOutlined,UserOutlined } from '@ant-design/icons';
import { Alert,Button, Form, Input, Select } from 'antd';
import { FormInstance } from 'antd/lib/form';
import i18next from 'i18next';
import React, { Component } from 'react';

import { User as UserType } from '../../../../../src/lib/types/user';

interface UserFormProps {
	user: UserType,
	save: (User) => void,
}

interface UserFormState {
	initialLogin: string,
	type?: number
}

class UserForm extends Component<UserFormProps, UserFormState> {
	formRef = React.createRef<FormInstance>();

	constructor(props) {
		super(props);
		this.state = {
			initialLogin: this.props.user.login,
			type: this.props.user?.type
		};
	}

	passwordValidator = (_, value) => {
		if (+this.formRef.current.getFieldValue('type') < 2 && !this.state.initialLogin && !value) {
			return Promise.reject(i18next.t('USERS.PASSWORD_VALIDATOR_MESSAGE'));
		} else {
			return Promise.resolve();
		}
	};

	loginValidator = (_, value: string) => {
		if (!this.state.initialLogin && value.includes('@')) {
			return Promise.reject(i18next.t('USERS.CHAR_NOT_ALLOWED', { char: '@' }));
		} else {
			return Promise.resolve();
		}
	};

	render() {
		return (
			<Form ref={this.formRef} onFinish={this.props.save} className='login-form'
				initialValues={{
					type: `${this.props.user.type}`, login: this.props.user.login,
					nickname: this.props.user.nickname, bio: this.props.user.bio, email: this.props.user.email,
					url: this.props.user.url
				}}>
				{this.props.user.login && this.props.user.login.includes('@') ?
					<Alert type="info" showIcon style={{ marginBottom: '10px' }}
						message={i18next.t('USERS.EDIT_ONLINE_ACCOUNT')}></Alert> : null
				}
				<Form.Item name="type" required={true}>
					<Select onChange={(value) => this.setState({ type: parseInt(value.toString()) })}>
						<Select.Option value='0'>{i18next.t('USERS.ADMIN')}</Select.Option>
						<Select.Option value='1'>{i18next.t('USERS.USER')}</Select.Option>
						<Select.Option value='2'>{i18next.t('USERS.GUEST')}</Select.Option>
					</Select>
				</Form.Item>
				<Form.Item name="login" required={true} rules={[{ validator: this.loginValidator }]}>
					<Input
						disabled={this.props.user.login && this.props.user.login.includes('@')}
						prefix={<UserOutlined />}
						placeholder={i18next.t('USERS.LOGIN')}
					/>
				</Form.Item>
				{this.state.type === 2 ? null :
					<Form.Item name="password" rules={[{ validator: this.passwordValidator }]}>
						<Input
							disabled={this.props.user.login && this.props.user.login.includes('@')}
							prefix={<LockOutlined />}
							type='password'
							placeholder={i18next.t('USERS.PASSWORD')}
						/>
					</Form.Item>
				}
				<Form.Item name="nickname" required={true}>
					<Input
						disabled={this.props.user.login && this.props.user.login.includes('@')}
						placeholder={i18next.t('USERS.NICKNAME')} />
				</Form.Item>
				<Form.Item required={true} name="bio">
					<Input.TextArea
						disabled={this.props.user.login && this.props.user.login.includes('@')}
						rows={3}
						placeholder={i18next.t('USERS.BIO')}
					/>
				</Form.Item>
				<Form.Item rules={[{ type: 'email' }]} name="email">
					<Input
						disabled={this.props.user.login && this.props.user.login.includes('@')}
						placeholder={i18next.t('USERS.EMAIL')} />
				</Form.Item>
				<Form.Item rules={[{ type: 'url' }]} name="url">
					<Input disabled={this.props.user.login && this.props.user.login.includes('@')}
						placeholder={i18next.t('USERS.URL')} />
				</Form.Item>
				<Form.Item>
					<Button type='primary' htmlType='submit' className='login-form-button'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
			</Form>
		);
	}
}

export default UserForm;
