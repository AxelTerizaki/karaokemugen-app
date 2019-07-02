import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import axios from 'axios';

class PollModal extends Component {
    constructor(props) {
        super(props)
        this.state = {
            poll: []
        };
        this.getSongPoll();
    }

    async getSongPoll() {
        var response = await axios.get('/api/public/songpoll');
        this.setState({ poll: response.data.data.poll });
        $('#pollModal').modal('show');
        $('#pollModal .timer').finish().width('100%').animate({ width: '0%' }, response.data.data.timeLeft, 'linear');
    }

    postSong(event) {
        axios.post('/api/public/songpoll', { playlistcontent_id: event.target.value });
        $('#pollModal').modal('hide');
    }

    render() {
        const t = this.props.t;
        return (
            <div className="modal-dialog modal-md">
                <div className="modal-content">
                    <ul className="nav nav-tabs nav-justified modal-header">
                        <li className="modal-title active">
                            <a data-toggle="tab" href="#nav-poll" role="tab" aria-controls="nav-poll" aria-selected="true" style={{ fontWeight: 'bold' }}>
                                {t("POLLTITLE")}</a>
                        </li>
                        <button className="closeModal btn btn-action" data-dismiss="modal" aria-label="Close"></button>
                        <span className="timer"></span>

                    </ul>
                    <div className="tab-content" id="nav-tabContent">
                        <div id="nav-poll" role="tabpanel" aria-labelledby="nav-poll-tab"
                            className="modal-body tab-pane fade in active" style={{ height: 3*this.state.poll.length+'em'}}>
                            <div className="modal-message">
                                {this.state.poll.map(kara => {
                                    return <button className="btn btn-default tour poll" key={kara.playlistcontent_id} value={kara.playlistcontent_id}
                                        onClick={this.postSong}
                                        style={{
                                            backgroundColor: 'hsl('
                                                + Math.floor(Math.random() * 256)
                                                + ',20%, 26%)'
                                        }}>
                                        {window.buildKaraTitle(kara)}
                                    </button>
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        )
    }
}

export default withTranslation()(PollModal);
