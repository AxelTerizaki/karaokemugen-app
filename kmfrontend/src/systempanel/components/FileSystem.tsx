import { FileOutlined, FolderOutlined, LeftOutlined, UsbOutlined } from '@ant-design/icons';
import { Button, List } from 'antd';
import i18next from 'i18next';
import React, { useEffect, useState } from 'react';

import { commandBackend } from '../../utils/socket';

interface IProps {
	path: string;
	os: string;
	seeFiles?: boolean;
	fileRequired?: boolean;
	saveValueModal: (value) => void;
}

function mapDrives(drives: { mount: string, label: string }[]) {
	return {
		contents: drives.map<ListingElement>(d => {
			return { name: d.mount, isDirectory: true, drive: d.label };
		}), fullPath: ''
	};
}

async function getFS(path: string, os: string) {
	if (!path) path = '/';
	let computedPath = (path.length > 1 && os === 'win32') ? path.substr(1) : path;
	let response;
	try {
		response = await commandBackend('getFS', { path });
	} catch (error) {
		// Folder don't exist fallback to root folder
		computedPath = '/';
		response = await commandBackend('getFS', { path: '/' });
	}
	if (os === 'win32' && computedPath === '/') {
		response = mapDrives(response.drives);
	}
	return response;
}

type ListingElement = { name: string, isDirectory: boolean, back?: boolean, drive?: string }
type Listing = ListingElement[];

function computeListing(listing: Listing, path: string, seeFiles: boolean): Listing {
	const filteredListing = seeFiles ? listing : listing.filter(el => el.isDirectory);
	if (path === '/' || path === '') {
		return filteredListing; // as is
	} else {
		return [{ name: i18next.t('CONFIG.BACK'), isDirectory: true, back: true }, ...filteredListing]; // return listing with back button
	}
}

export default function FileSystem(props: IProps) {
	const [listing, setListing] = useState<Listing>([]);
	const [path, setPath] = useState<string>();

	const separator = props.os === 'win32' ? '\\' : '/';

	function getFSCallback(res) {
		setListing(computeListing(res.contents, res.fullPath, props.seeFiles));
		if (res.fullPath.lastIndexOf(separator) !== res.fullPath.length - 1) res.fullPath = `${res.fullPath}${separator}`;
		setPath(res.fullPath);
	}

	function browseInto(item: ListingElement) {
		if (item.isDirectory) {
			const newPath = item.back ?
				path.substr(0,
					props.os === 'win32' ? (
						path.substr(0, path.length - 1).lastIndexOf(separator) === 3 ?
							3 :
							path.substr(0, path.length - 1).lastIndexOf(separator) + 1
					) : path.lastIndexOf(separator) === 0 ? 1 : path.lastIndexOf(separator)
				) :
				`${path}${item.name}${separator}`;
			getFS(newPath, props.os).then(getFSCallback);
			if (!props.fileRequired) props.saveValueModal(props.os === 'win32' ? newPath.substr(1) : newPath);
		} else if (props.fileRequired) {
			props.saveValueModal(`${path}${separator}${item.name}`);
		}
	}

	useEffect(() => {
		getFS(props.fileRequired ?
			path.substr(0, path.lastIndexOf(separator) === 0 ? 1 : path.lastIndexOf(separator)) : props.path, props.os)
			.then(getFSCallback);
	}, []);

	return <List
		header={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			{path}
			{!props.fileRequired ? <Button type="primary">{i18next.t('CONFIG.SELECT')}</Button> : null}
		</div>}
		dataSource={listing}
		renderItem={item => (
			(!item.isDirectory && !props.seeFiles) ? null : <List.Item>
				<Button type="text" disabled={(props.fileRequired && item.isDirectory) || (!props.fileRequired && !item.isDirectory)} onClick={() => browseInto(item)}>
					{item.drive ? <UsbOutlined /> : (item.back ? <LeftOutlined /> : (item.isDirectory ? <FolderOutlined /> : <FileOutlined />))}
					{item.name} {item.drive ? <span>({item.drive})</span> : null}
				</Button>
			</List.Item>
		)}
	/>;
}
