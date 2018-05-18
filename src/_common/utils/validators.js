import validate from 'validate.js';
import testJSON from 'is-valid-json';
import {has as hasLang} from 'langs';

function boolIntValidator(value) {
	if (+value !== 0 && +value !== 1) return ` '${value}' is invalid`;	
	return null;
}

function isJSON(value) {
	if (testJSON(value)) return null;
	return ` '${value}' is invalid JSON`;	
}

function numbersArrayValidator(value) {
	if (value) {		
		if (value.includes(',')) {
			const array = value.split(',');
			if (array.every(!isNaN)) return null;
			return ` '${value}' is invalid`;	
		}
		if (!isNaN(value)) return null;
		return ` '${value}' is invalid`;	
	}
	return ` '${value}' is invalid`;
}

// Sanitizers

export function unescape(str) {
	return str
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, '\'')
		.replace(/&#x3A;/g, ':')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

// Init

function integerValidator(value) {
	let result = null;	
	if (value !== 'und' && value < 0) {
		result = ` '${value}' is invalid`;
	}
	return result;
}

function langValidator(value) {
	const langs = value.replace('"', '').split(',');
	let result = null;
	for (const lang of langs) {		
		if (!(lang === 'und' || lang === 'mul' || hasLang('2B', lang))) {
			result = `Lang '${lang}' is invalid`;
			break;
		}
	}
	return result;
}

export function initValidators() {
	if (!validate.validators.boolIntValidator) validate.validators.boolIntValidator = boolIntValidator;
	if (!validate.validators.numbersArrayValidator) validate.validators.numbersArrayValidator = numbersArrayValidator;
	if (!validate.validators.integerValidator) validate.validators.integerValidator = integerValidator;
	if (!validate.validators.isJSON) validate.validators.isJSON = isJSON;
	if (!validate.validators.langValidator) validate.validators.langValidator = langValidator;
}

export function check(obj, constraints) {
	initValidators();
	return validate(obj, constraints);
}

