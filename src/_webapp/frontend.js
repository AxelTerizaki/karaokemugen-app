import {join, resolve} from 'path';
import express from 'express';
import exphbs from 'express-handlebars';
import cookieParser from 'cookie-parser';
import {address} from 'ip';
import {graphics} from 'systeminformation';
import logger from 'winston';
import i18n from 'i18n';
import {getConfig} from '../_utils/config';
import {urlencoded, json} from 'body-parser';
import passport from 'passport';
import {configurePassport} from '../_webapp/passport_manager';
import {createServer} from 'http';
import { initializationCatchphrases } from '../_services/constants';
import sample from 'lodash.sample';

// Api routes
import systemController from '../_controllers/system';
import authController from '../_controllers/auth';
import {APIControllerPublic, APIControllerAdmin} from '../_controllers/api';


let ws;

export function emitWS(type,data) {
	//logger.debug( '[WS] Sending message '+type+' : '+JSON.stringify(data));
	if (ws) ws.sockets.emit(type,data);
}

function apiRouter() {
	const apiRouter = express.Router();

	// Add auth routes
	authController(apiRouter);
	// Add system route
	systemController(apiRouter);
	// Add public/admin routes
	APIControllerPublic(apiRouter);
	APIControllerAdmin(apiRouter);

	return apiRouter;
}


export async function initFrontend(port) {
	const app = express();
	app.engine('hbs', exphbs({
		layoutsDir: join(__dirname, 'ressources/views/layouts/'),
		extname: '.hbs',
		helpers: {
			i18n: function() {
				const args = Array.prototype.slice.call(arguments);
				const options = args.pop();
				return i18n.__.apply(options.data.root, args);
			},
			if_eq: function(a, b, opts) {
				if(a === b)
					return opts.fn(this);
				else
					return opts.inverse(this);
			}
		}
	}));
	const routerAdmin = express.Router();
	const routerWelcome = express.Router();
	app.use(passport.initialize());
	configurePassport();
	const conf = getConfig();
	app.set('view engine', 'hbs');
	app.set('views', join(__dirname, 'ressources/views/'));
	app.use(cookieParser());
	app.use(i18n.init);
	app.use(urlencoded({ extended: true, limit: '50mb' }));
	app.use(json());
	app.use('/api', apiRouter());
	// Add headers
	app.use(function (req, res, next) {
		// Website you wish to allow to connect
		res.setHeader('Access-Control-Allow-Origin', '*');
		// Request methods you wish to allow
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
		// Request headers you wish to allow
		res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization, Accept, Key');
		if (req.method === 'OPTIONS') {
			res.statusCode = 200;
			res.json();
		} else {
			// Pass to next layer of middleware
			next();
		}
	});
	app.use(express.static(__dirname + '/'));
	//path for system control panel
	if (!conf.isDemo) {
		app.use('/system', express.static(resolve(__dirname, '../../react_systempanel/build')));
		app.get('/system/*', (req, res) => {
			res.sendFile(resolve(__dirname, '../../react_systempanel/build/index.html'));
		});
	}
	//Path to locales for webapp
	app.use('/locales',express.static(__dirname + '/../_locales/'));
	//Path to video previews
	app.use('/previews',express.static(resolve(conf.appPath,conf.PathPreviews)));
	//Path to user avatars
	app.use('/avatars',express.static(resolve(conf.appPath,conf.PathAvatars)));
	app.use('/admin', routerAdmin);
	app.use('/welcome', routerWelcome);

	app.get('/', (req, res) => {
		const config = getConfig();

		let view = 'public';
		if(+config.WebappMode === 0) {
			view = 'publicClosed';
		} else if (+config.WebappMode === 1) {
			view = 'publicLimited';
		}
		let url;
		if (+config.EngineDisplayConnectionInfoHost) {
			url = config.EngineDisplayConnectionInfoHost;
		} else {
			url = address();
		}

		res.render(view, {'layout': 'publicHeader',
			'clientAdress'	:	`http://${url}`,
			'webappMode'	:	config.WebappMode,
            'onlineHost'  	:	config.OnlineUsers ? config.OnlineHost : '',
			'query'			:	JSON.stringify(req.query)
		});
	});
	routerAdmin.get('/', (req, res) => {
		const config = getConfig();

		//Get list of monitors to allow users to select one for the player
		graphics().then((data) => {
			logger.debug('[Webapp] Displays detected : '+JSON.stringify(data.displays));
			[0,1,2,3,4].forEach(function(key) {
				if (data.displays[key] && data.displays[key].model) {
					data.displays[key].model = data.displays[key].model.replace('�','e');
				}
				if (!data.displays[key]) {
					data.displays[key] = {model : ''};
				}
			});

			res.render('admin', {'layout': 'adminHeader',
				'clientAdress'	:	`http://${address()}`,
				'displays'		:	data.displays,
				'query'			:	JSON.stringify(req.query),
				'appFirstRun'	:	config.appFirstRun,
                'onlineHost'  	:	config.OnlineUsers ? config.OnlineHost : '',
				'webappMode'	:	config.WebappMode
			});
		});
	});
	routerWelcome.get('/', (req, res) => {
		res.render('welcome', {
			'catchphrases'	:	sample(initializationCatchphrases),
			'clientAdress'	:	`http://${address()}`,
			'query'			:	JSON.stringify(req.query),
		});
	});

	app.use((req, res) => {
		res.status(404);
		// respond with html page
		if (req.accepts('html')) {
			res.render('404', {url: req.url});
			return;
		}
		// default to plain-text. send()
		res.type('txt').send('Not found');
	});
	const server = createServer(app);
	ws = require('socket.io').listen(server);
	server.listen(port, () => {
		logger.debug(`[Webapp] Webapp is READY and listens on port ${port}`);
	});
}


