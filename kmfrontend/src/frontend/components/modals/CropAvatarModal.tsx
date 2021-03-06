import 'react-image-crop/dist/ReactCrop.css';

import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import ReactCrop from 'react-image-crop';

import { commandBackend, isRemote } from '../../../utils/socket';

interface IProps {
	src: any;
	saveAvatar: (avatar?) => void;
}

interface IState {
	imageRef?: any;
	imageSource: any;
	crop: any;

}

class CropAvatarModal extends Component<IProps, IState> {

	state = {
		crop: {
			unit: '%',
			width: 100,
			height: undefined,
			aspect: 1,
		},
		imageRef: undefined,
		imageSource: undefined
	}

	componentDidMount() {
		const reader = new FileReader();
		reader.addEventListener('load', () =>
			this.setState({ imageSource: reader.result })
		);
		reader.readAsDataURL(this.props.src);
	}

	onImageLoaded = imageRef => {
		this.setState({ imageRef });
	};

	onCropChange = (crop) => {
		this.setState({ crop });
	};


	getCroppedImg(image, crop) {
		const canvas = document.createElement('canvas');
		const scaleX = image.naturalWidth / image.width;
		const scaleY = image.naturalHeight / image.height;
		canvas.width = crop.width;
		canvas.height = crop.height;
		const ctx = canvas.getContext('2d');

		ctx.drawImage(
			image,
			crop.x * scaleX,
			crop.y * scaleY,
			crop.width * scaleX,
			crop.height * scaleY,
			0,
			0,
			crop.width,
			crop.height
		);

		return new Promise((resolve) => {
			canvas.toBlob(blob => {
				if (!blob) {
					//reject(new Error('Canvas is empty'));
					console.error('Canvas is empty');
					return;
				}
				resolve(blob);
			}, 'image/jpeg');
		});
	}

	saveAvatar = async () => {
		if (this.state.imageRef && this.state.crop.width && this.state.crop.height) {
			const croppedImageUrl = await this.getCroppedImg(this.state.imageRef, this.state.crop);
			if (croppedImageUrl) {
				if (isRemote()) {
					const response = await commandBackend('importfile', {extension: 'jpg', buffer: croppedImageUrl});
					this.props.saveAvatar({path: response.filename});
				} else {
					const formData = new FormData();
					formData.append('file', croppedImageUrl as any);	
					const response = await fetch('/api/importfile', {
						method: 'POST',
						body: formData,
						headers: {
							authorization: localStorage.getItem('kmToken'),
							onlineAuthorization: localStorage.getItem('kmOnlineToken')
						}
					});
					this.props.saveAvatar(await response.json());
				}
				this.closeModal();
			}
		}
	};


	closeModal = () => {
		const element = document.getElementById('import-avatar');
		if (element) ReactDOM.unmountComponentAtNode(element);
		this.props.saveAvatar();
	}

	render() {
		return (
			<div className="modal modalPage">
				<div className="modal-dialog">
					<div className="modal-content">
						<ul className="modal-header">
							<h4 className="modal-title">{i18next.t('MODAL.CROP_AVATAR_MODAL.TITLE')}</h4>
						</ul>
						<div className="modal-body">
							<ReactCrop
								src={this.state.imageSource}
								crop={this.state.crop}
								onImageLoaded={this.onImageLoaded}
								onChange={this.onCropChange}
							/>
						</div>
						<div className="modal-footer">
							<em className="modal-help">{i18next.t('MODAL.CROP_AVATAR_MODAL.HELP')}</em>
							<button type="button" className="btn btn-action btn-primary other" onClick={this.closeModal}>
								<i className="fas fa-times" /> {i18next.t('CANCEL')}
							</button>
							<button type="button" className="btn btn-action btn-default ok" onClick={this.saveAvatar}>
								<i className="fas fa-check" /> {i18next.t('SUBMIT')}
							</button>
						</div>
					</div>
				</div>
			</div >
		);
	}
}

export default CropAvatarModal;
