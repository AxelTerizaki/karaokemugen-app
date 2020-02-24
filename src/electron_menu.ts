import { app } from 'electron';
import i18next from 'i18next';
import {setManualUpdate, win} from './electron';
import {autoUpdater} from 'electron-updater';
import {exit} from './services/engine';
import { getConfig, setConfig } from './lib/utils/config';

const isMac = process.platform === 'darwin'

let menuItems: any

export function getMenu() {
	return menuItems;
}

function isOpenElectron(): boolean {
	return getConfig().GUI.OpenInElectron;
}

export async function initMenu() {
	const port = getConfig().Frontend.Port;
	const base = 'http://localhost';
	const urls = {
		operatorOptions: `${base}:${port}/admin/?config`,
		systemOptions: `${base}:${port}/system/km/config`,
		home: `${base}:${port}/welcome`,
		operator: `${base}:${port}/admin`,
		public: `${base}:${port}/public`,
		system: `${base}:${port}/system`,
		logs: `${base}:${port}/system/km/log`,
		download: `${base}:${port}/system/km/karas/download`,
		karas: `${base}:${port}/system/km/karas`,
		database: `${base}:${port}/system/km/db`
	}
	menuItems = [
		/**
		 *
		 * MAIN MENU / FILE MENU
		 *
		 */
		{
			label: isMac ? app.name : i18next.t('MENU_FILE'),
			submenu: [
				!isMac ? {
					// Updater menu disabled on macs until we can sign our code
					label: i18next.t('MENU_FILE_UPDATE'),
					click: async () => {
						setManualUpdate(true);
						await autoUpdater.checkForUpdates();
						setManualUpdate(false);
					}
				} : { role: 'services' },
				{
					label: i18next.t('MENU_FILE_ABOUT'),
					click() {
						app.showAboutPanel();
					}
				},
				{ type: 'separator'},
				{
					label: i18next.t('MENU_FILE_QUIT'),
					accelerator: 'CmdOrCtrl+Q',
					click() {
						exit(0);
					}
				}
			]
		},
		/**
		 *
		 * EDIT MENU
		 *
		 */
		{
			label: i18next.t('MENU_EDIT'),
			submenu: [
			  { label: i18next.t('MENU_EDIT_UNDO'), role: 'undo' },
			  { label: i18next.t('MENU_EDIT_REDO'), role: 'redo' },
			  { type: 'separator' },
			  { label: i18next.t('MENU_EDIT_CUT'), role: 'cut' },
			  { label: i18next.t('MENU_EDIT_COPY'), role: 'copy' },
			  { label: i18next.t('MENU_EDIT_PASTE'), role: 'paste' },
			  ...(isMac ? [
				{ label: i18next.t('MENU_EDIT_PASTEWITHSTYLE'), role: 'pasteAndMatchStyle' },
				{ label: i18next.t('MENU_EDIT_DELETE'), role: 'delete' },
				{ label: i18next.t('MENU_EDIT_SELECT_ALL'), role: 'selectAll' },
				{ type: 'separator' },
				{
				  label: i18next.t('MENU_EDIT_SPEECH'),
				  submenu: [
					{ label: i18next.t('MENU_EDIT_STARTSPEECH'), role: 'startspeaking' },
					{ label: i18next.t('MENU_EDIT_STOPSPEECH'), role: 'stopspeaking' }
				  ]
				}
			  ] : [
				{ label: i18next.t('MENU_EDIT_DELETE'), role: 'delete' },
				{ type: 'separator' },
				{ label: i18next.t('MENU_EDIT_SELECTALL'), role: 'selectAll' }
			  ])
			]
		  },
		  /**
		   *
		   * VIEW MENU
		   *
		   */
		  {
			label: i18next.t('MENU_VIEW'),
			submenu: [
			  { label: i18next.t('MENU_VIEW_RELOAD'), role: 'reload' },
			  { label: i18next.t('MENU_VIEW_RELOADFORCE'), role: 'forcereload' },
			  { label: i18next.t('MENU_VIEW_TOGGLEDEVTOOLS'), role: 'toggledevtools' },
			  { type: 'separator' },
			  { label: i18next.t('MENU_VIEW_RESETZOOM'), role: 'resetzoom' },
			  { label: i18next.t('MENU_VIEW_ZOOMIN'), role: 'zoomin' },
			  { label: i18next.t('MENU_VIEW_ZOOMOUT'), role: 'zoomout' },
			  { type: 'separator' },
			  { label: i18next.t('MENU_VIEW_FULLSCREEN'), role: 'togglefullscreen' }
			]
		  },
		  /**
		   *
		   * GO TO MENU
		   *
		   */
		  {
			label: i18next.t('MENU_GOTO'),
			submenu: [
				{
					label: i18next.t('MENU_GOTO_HOME'),
					click() {
						isOpenElectron()
							? win.loadURL(urls.home)
							: open(urls.home)
					}
				},
				{
					label: i18next.t('MENU_GOTO_OPERATOR'),
					click() {
						isOpenElectron()
							? win.loadURL(urls.operator)
							: open(urls.operator)
					}
				},
				{
					label: i18next.t('MENU_GOTO_SYSTEM'),
					click() {
						isOpenElectron()
							? win.loadURL(urls.system)
							: open(urls.system)
					}
				},
				{
					label: i18next.t('MENU_GOTO_PUBLIC'),
					click() {
						isOpenElectron()
							? win.loadURL(urls.public)
							: open(urls.public)
					}
				},
			]
		  },
		  /**
		   *
		   * TOOLS MENU
		   *
		   */
		  {
			label: i18next.t('MENU_TOOLS'),
			submenu: [
				{
					label: i18next.t('MENU_TOOLS_LOGS'),
					click() {
						isOpenElectron()
							? win.loadURL(urls.logs)
							: open(urls.logs)
					}
				},
				{
					label: i18next.t('MENU_TOOLS_DOWNLOADS'),
					click() {
						isOpenElectron()
							? win.loadURL(urls.download)
							: open(urls.download)
					}
				},
				{
					label: i18next.t('MENU_TOOLS_KARAOKES'),
					click() {
						isOpenElectron()
							? win.loadURL(urls.karas)
							: open(urls.karas)
					}
				},
				{
					label: i18next.t('MENU_TOOLS_DATABASE'),
					click() {
						isOpenElectron()
							? win.loadURL(urls.database)
							: open(urls.database)
					}
				},
			]
		  },
		  /**
		   *
		   * OPTIONS
		   *
		   */
		  {
			label: i18next.t('MENU_OPTIONS'),
			submenu: [
				{
					label: i18next.t('MENU_OPTIONS_OPENINELECTRON'),
					type: 'checkbox',
					checked: isOpenElectron(),
					click() {
						setConfig({ GUI: {OpenInElectron: !isOpenElectron()}});
					}
				},
				{
					label: i18next.t('MENU_OPTIONS_OPERATORCONFIG'),
					click() {
						isOpenElectron()
							? win.loadURL(urls.operatorOptions)
							: open(urls.operatorOptions)
					}
				},
				{
					label: i18next.t('MENU_OPTIONS_SYSTEMCONFIG'),
					click() {
						isOpenElectron()
							? win.loadURL(urls.systemOptions)
							: open(urls.systemOptions)
					}
				},
			]
		  },
		  /**
		   *
		   * WINDOW MENU
		   *
		   */
		  {
			label: i18next.t('MENU_WINDOW'),
			submenu: [
			  { label: i18next.t('MENU_WINDOW_MINIMIZE'), role: 'minimize' },
			  ...(isMac ? [
				{ type: 'separator' },
				{ label: i18next.t('MENU_WINDOW_TOFRONT'), role: 'front' },
				{ type: 'separator' }
			  ] : [
				{ label: i18next.t('MENU_WINDOW_CLOSE'), role: 'close' }
			  ])
			]
		  },
		  /**
		   *
		   * HELP MENU
		   *
		   */
		  {
			label: i18next.t('MENU_HELP'),
			role: 'help',
			submenu: [
			  {
				label: i18next.t('MENU_HELP_WEBSITE'),
				click: () => {
				  open('https://karaokes.moe')
				}
			  }
			]
		  }
	];
}
