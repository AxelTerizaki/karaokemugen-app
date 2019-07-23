import { Switch, Route } from 'react-router'
import WelcomePage from './components/WelcomePage';
import AdminPage from './components/AdminPage';
import { withTranslation } from "react-i18next";
import PublicPage from './components/PublicPage';
import React, { Component, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from "react-router-dom";
import './components/i18n';
import NotFoundPage from './components/NotfoundPage'
import io from 'socket.io-client';
import langs from "langs";
import axios from "axios";
import { readCookie, parseJwt, createCookie } from "./components/toolsReact"
import Modal from './components/modals/Modal';
import './components/oldTools';
class App extends Component {
    constructor(props) {
        super(props);
        window.translation = this.props.t;
        window.socket = io();
        window.callModal = this.callModal;
        this.state = {
            navigatorLanguage: this.getNavigatorLanguage(),
            logInfos: this.getLogInfos(),
            admpwd: window.location.search.indexOf('admpwd') ? window.location.search.split("=")[1] : undefined,
            shutdownPopup: false
        }
        this.getSettings = this.getSettings.bind(this);
        this.updateLogInfos = this.updateLogInfos.bind(this);
        axios.defaults.headers.common['authorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenToken\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        axios.defaults.headers.common['onlineAuthorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenTokenOnline\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    }

    getLogInfos() {
        let logInfos = {};
        var token = readCookie('mugenToken');
        var onlineToken = readCookie('mugenTokenOnline');
        if (token) {
            logInfos = parseJwt(token);
            logInfos.token = token;
            if (onlineToken) {
                logInfos.onlineToken = onlineToken;
            }
        }
        return logInfos;
    }

    updateLogInfos(data) {
        let logInfos = parseJwt(data.token);
        createCookie('mugenToken', data.token, -1);
        if (data.onlineToken) {
            createCookie('mugenTokenOnline', data.onlineToken, -1);
        } else if (!logInfos.username.includes('@')) {
            eraseCookie('mugenTokenOnline');
        }

        logInfos.token = data.token;
        logInfos.onlineToken = data.onlineToken;
        this.setState({ logInfos: logInfos });
        axios.defaults.headers.common['authorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenToken\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        axios.defaults.headers.common['onlineAuthorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenTokenOnline\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    }

    logOut() {
        eraseCookie('mugenToken');
        eraseCookie('mugenTokenOnline');
        this.setState({ logInfos: {} });
        axios.defaults.headers.common['authorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenToken\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        axios.defaults.headers.common['onlineAuthorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenTokenOnline\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    }

    async componentDidMount() {
        this.getSettings();
        window.socket.on('settingsUpdated', this.getSettings);
        window.socket.on('connect', () => this.setState({ shutdownPopup: false }));
    }

    async getSettings() {
        const res = await axios.get('/api/public/settings');
        this.setState({ settings: res.data.data });
    }

    getNavigatorLanguage() {
        var navigatorLanguage;
        var languages = langs.all();
        var index = 0;
        while (!navigatorLanguage && index < languages.length) {
            if (navigator.languages[0].substring(0, 2) === languages[index]["1"]) {
                navigatorLanguage = languages[index]["2B"];
            }
            index++;
        }
        return navigatorLanguage;
    }

    callModal(type, title, message, callback, placeholder) {
        ReactDOM.render(<Suspense fallback={<div>loading...</div>}><Modal type={type} title={title} message={message}
            callback={callback} placeholder={placeholder} /></Suspense>, document.getElementById('root'));
        $('#modalBox').modal('show');
    }

    powerOff() {
        axios.post("/api/admin/shutdown");
        this.setState({ shutdownPopup: true });
        $('.noise').animate({
            opacity: 0.38
        }, 30000);
    }

    render() {
        return (
            this.state.shutdownPopup ?
                <div className="shutdown-popup">
                    <div className="noise-wrapper" style="opacity: 1;">
                        <div className="noise"></div>'
				    </div>
                    <div className="shutdown-popup-text">{this.props.t('SHUTDOWN_POPUP')}</div>
                    <button title={this.props.t('TOOLTIP_CLOSEPARENT')} className="closeParent btn btn-action"
                    onClick={() => this.setState({shutdownPopup: false})}></button>
                </div> :
                this.state.settings ?
                    <Switch>
                        <Route path="/welcome" render={(props) => <WelcomePage {...props}
                            navigatorLanguage={this.state.navigatorLanguage} settings={this.state.settings} logInfos={this.state.logInfos}
                            admpwd={this.state.admpwd} updateLogInfos={this.updateLogInfos} logOut={this.logOut} />} />
                        <Route path="/admin" render={(props) => <AdminPage {...props}
                            navigatorLanguage={this.state.navigatorLanguage} settings={this.state.settings} logInfos={this.state.logInfos}
                            updateLogInfos={this.updateLogInfos} powerOff={this.powerOff}logOut={this.logOut} />} />
                        <Route exact path="/" render={(props) => <PublicPage {...props}
                            navigatorLanguage={this.state.navigatorLanguage} settings={this.state.settings} logInfos={this.state.logInfos}
                            updateLogInfos={this.updateLogInfos} logOut={this.logOut} />} />
                        <Route component={NotFoundPage} />
                    </Switch> : null
        )
    }
}

export default withTranslation()(App);
ReactDOM.render(<BrowserRouter><App /></BrowserRouter>, document.getElementById('root'));