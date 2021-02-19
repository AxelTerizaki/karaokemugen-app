import './InlineTag.scss';

import i18next from 'i18next';
import React, {useEffect, useRef, useState} from 'react';

import {DBKaraTag} from '../../../../../src/lib/types/database/kara';
import {getTagInLocale} from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { View } from '../../types/view';

interface Props {
	tag: DBKaraTag;
	className: string;
	scope: string;
	tagType: number;
	changeView: (
		view: View,
		tagType?: number,
		searchValue?: string,
		searchCriteria?: 'year' | 'tag'
	) => void;
}

export default function InlineTag(props: Props) {
	const [showPopup, setShowPopup] = useState(false);
	const [count, setCount] = useState(0);
	const node: any = useRef();

	const goToTagSearch = () => {
		const searchValue = `${props.tag.tid}~${props.tagType}`;
		props.changeView('search', props.tagType, searchValue, 'tag');
	};

	const getTag = async () => {
		const res = await commandBackend('getTag', {tid: props.tag.tid});
		const count = Array.isArray(res.karacount)
			? res.karacount.filter((karacount: any) => karacount.type === props.tagType)
			: [];
		if (count.length > 0) setCount(count[0].count);
	};

	const handleClick = (e: any) => {
		if (node.current.contains(e.target)) {
			// inside click
			return;
		}
		// outside click
		setShowPopup(false);
	};

	useEffect(() => {
		// add when mounted
		document.addEventListener('mousedown', handleClick);
		// return function to be called when unmounted
		return () => {
			document.removeEventListener('mousedown', handleClick);
		};
	});

	getTag();

	return (
		<div className={`inline-tag ${props.scope === 'public' ? 'public' : ''}`} ref={node}>
			<span className={props.className} onClick={() => {
				if (props.scope === 'public') setShowPopup(!showPopup);
			}}>{getTagInLocale(props.tag)}</span>
			{showPopup ? <div className="tag-popup">
				<p className="tag-name">{getTagInLocale(props.tag)}</p>
				<p className="tag-stat">{i18next.t('INLINE_TAG.COUNT', {count: count})}</p>
				<p className="tag-action">
					<button className="btn" onClick={goToTagSearch}>
						<i className="fas fa-fw fa-search" />{i18next.t('INLINE_TAG.SEARCH', {tag: getTagInLocale(props.tag)})}
					</button>
				</p>
			</div> : null}
		</div>
	);
}
