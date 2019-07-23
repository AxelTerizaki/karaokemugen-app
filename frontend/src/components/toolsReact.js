import axios from "axios";

export function parseJwt(token) {
	var base64Url = token.split('.')[1];
	var base64 = base64Url.replace('-', '+').replace('_', '/');
	return JSON.parse(window.atob(base64));
};

export function createCookie(name, value, days) {
	var expires;
	if (days) {
		var date = new Date();
		if (days === -1) days = 365 * 15;
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		expires = '; expires=' + date.toGMTString();
	} else expires = '';
	document.cookie = name + '=' + value + expires + '; path=/';
};

export function readCookie(name) {
	var nameEQ = name + '=';
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
	}
	return null;
};

export function eraseCookie(name) {
	createCookie(name, '', -1);
};

export function is_touch_device() {
	var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
	var mq = function (query) {
		return window.matchMedia(query).matches;
	};

	if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
		return true;
	}

	// include the 'heartz' as a way to have a non matching MQ to help terminate the join
	// https://git.io/vznFH
	var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
	return mq(query);
};


export function expand (str, val) {
	return str.split('.').reduceRight((acc, currentValue) => {
		return { [currentValue]: acc };
	}, val);
};



/* format seconds to Hour Minute Second */
export function secondsTimeSpanToHMS (s, format) {
	var d = Math.floor(s/(3600 * 24));
	if (format === '24h' || format === 'dhm') {
		s -= d * 3600 * 24;
	}
	var h = Math.floor(s/3600);
	if (format !== 'ms') {
		s -= h * 3600;
	}
	var m = Math.floor(s/60);
	s -= m * 60;

	var result = (h > 0 ? h+'h' : '')+(m < 10 ? '0'+m : m)+'m'+(s < 10 ? '0'+s : s ) + 's';
	if (format === 'ms') result = (m > 0 ? m+'m' : '')+(s < 10 && m > 0 ? '0'+s : s ) + 's';
	if (format === 'hm') result = (h > 0 ? h+'h' : '')+(m < 10 ? '0'+m : m)+'m';
	if (format === 'dhm') {
		result = (d > 0 ? d+'d' : '')+(h > 0 ? h+'h' : '')+(m < 10 ? '0'+m : m)+'m';
	}
	return result; 
};

export function startIntro (scope){
	if (scope === 'admin') {
		axios.put('/api/admin/settings', JSON.stringify({ 'setting': {'App': {'FirstRun':false}} }));
	} else {
		createCookie('publicTuto', 'true');
	}
};