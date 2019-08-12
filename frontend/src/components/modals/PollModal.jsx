import React, { Component } from "react";
import i18next from 'i18next';
import axios from 'axios';
import {buildKaraTitle} from '../tools';

class PollModal extends Component {
    constructor(props) {
        super(props)
        this.state = {
            poll: []
        };
        this.getSongPoll = this.getSongPoll.bind(this);
        this.postSong = this.postSong.bind(this);
        this.getSongPoll();
    }

    async getSongPoll() {
        var response = await axios.get('/api/public/songpoll');
        this.setState({ poll: response.data.data.poll });
        $('#pollModal .timer').finish().width('100%').animate({ width: '0%' }, response.data.data.timeLeft, 'linear');
    }

    postSong(event) {
        axios.post('/api/public/songpoll', { playlistcontent_id: event.target.value });
        this.props.closePollModal();
    }

    render() {
        return (
            this.props.pollModal ?
                <div className="modal modalPage" id="pollModal">
                    <div className="modal-dialog modal-md">
                        <div className="modal-content">
                            <ul className="nav nav-tabs nav-justified modal-header">
                                <li className="modal-title active">
                                    <a style={{ fontWeight: 'bold' }}>{i18next.t("POLLTITLE")}</a>
                                </li>
                                <button className="closeModal btn btn-action" onClick={this.props.closePollModal}>
                                    <i className="fas fa-times"></i>
                                </button>
                                <span className="timer"></span>

                            </ul>
                            <div className="tab-content" id="nav-tabContent">
                                <div id="nav-poll" className="modal-body" style={{ height: 3 * this.state.poll.length + 'em' }}>
                                    <div className="modal-message">
                                        {this.state.poll.map(kara => {
                                            return <button className="btn btn-default tour poll" key={kara.playlistcontent_id} value={kara.playlistcontent_id}
                                                onClick={this.postSong}
                                                style={{
                                                    backgroundColor: 'hsl('
                                                        + Math.floor(Math.random() * 256)
                                                        + ',20%, 26%)'
                                                }}>
                                                {buildKaraTitle(kara)}
                                            </button>
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div >
                </div> : null
        )
    }
}

export default PollModal;
