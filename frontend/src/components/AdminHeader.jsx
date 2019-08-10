import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import { expand, getSocket } from "./tools";
import axios from "axios";
import RadioButton from "./RadioButton.jsx";
import KmAppHeaderDecorator from "./decorators/KmAppHeaderDecorator"

class AdminHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      privateMode: Boolean(this.props.config.Karaoke.Private),
      statusPlayer: {},
      dropDownMenu: false,
      songVisibilityOperator: Boolean(this.props.config.Playlist.MysterySongs.AddedSongVisibilityAdmin)
    };
    this.saveMode = this.saveMode.bind(this);
    this.adminMessage = this.adminMessage.bind(this);
    this.saveOperatorAdd = this.saveOperatorAdd.bind(this);
  }

  
  componentDidMount() {
    getSocket().on("playerStatus", data => {
      var val = parseInt(data.volume);
      var base = 100;
      var pow = 0.76;
      val = val / base;
      data.volume = base * Math.pow(val, 1 / pow);
      this.setState({ statusPlayer: data });
    });
  }

  saveMode(mode) {
    var data = expand("Karaoke.Private", mode);
    this.setState({ privateMode: mode });
    axios.put("/api/admin/settings", { setting: JSON.stringify(data) });
  }

  saveOperatorAdd(songVisibility) {
    var data = expand("Playlist.MysterySongs.AddedSongVisibilityAdmin", songVisibility);
    this.setState({ songVisibilityOperator: songVisibility });
    axios.put("/api/admin/settings", { setting: JSON.stringify(data) });
  }

  putPlayerCommando(event) {
    var namecommand = event.currentTarget.getAttribute("namecommand");
    var data;
    if (namecommand === "setVolume") {
      var volume = parseInt(event.currentTarget.value);
      var base = 100;
      var pow = 0.76;
      volume = Math.pow(volume, pow) / Math.pow(base, pow);
      volume = volume * base;
      data = {
        command: namecommand,
        options: volume
      };
    } else {
      data = {
        command: namecommand
      };
    }
    axios.put("/api/admin/player", data);
  }

  adminMessage() {
    this.props.callModal(
      "custom",
      "Message indispensable",
      '<select class="form-control" name="destination"><option value="screen">' +
        this.props.t("CL_SCREEN") +
        "</option>" +
        '<option value="users">' +
        this.props.t("CL_USERS") +
        '</option><option value="all">' +
        this.props.t("CL_ALL") +
        "</option></select>" +
        '<input type="text"name="duration" placeholder="5000 (ms)"/>' +
        '<input type="text" placeholder="Message" class="form-control" id="message" name="message">',
      function(data) {
        var defaultDuration = 5000;
        var msgData = {
          message: data.message,
          destination: data.destination,
          duration:
            !data.duration || isNaN(data.duration)
              ? defaultDuration
              : data.duration
        };
        axios.post("/api/admin/player/message", msgData);
      }
    );
  }

  render() {
    const t = this.props.t;

    let volume = parseInt(this.state.statusPlayer.volume);
    volume = isNaN(volume) ? 100 : volume;

    return (
      <KmAppHeaderDecorator mode="admin">
          <div
            className="btn btn-default btn-dark"
            id="manageButton"
          >
            <button
              className="btn btn-dark klogo"
              type="button"
              onClick={() => this.setState({dropDownMenu: !this.state.dropDownMenu})}
            />
            {this.state.dropDownMenu ?
              <ul className="dropdown-menu">
                <li
                  title={t("ACCOUNT")}
                  action="account"
                  className="btn btn-default btn-dark"
                  onClick={this.props.toggleProfileModal}
                >
                  <i className="fas fa-user"></i>
                </li>
                <li
                  title={t("LOGOUT")} onClick={this.props.logOut}
                  className="btn btn-default btn-dark"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </li>
                <li
                  title={t("SHUTDOWN")}
                  className="btn btn-default btn-dark"
                  onClick={this.props.powerOff}
                >
                  <i className="fas fa-power-off"></i>
                </li>
              </ul> : null
            }
          </div>

          <button
            title={t("MESSAGE")}
            id="adminMessage"
            className="btn btn-dark messageButton"
            onClick={this.adminMessage}
          >
            <i className="fas fa-comment"></i>
          </button>

          <button
            title={t("SHOW_HIDE_SUBS")}
            id="showSubs"
            namecommand={this.state.statusPlayer.showSubs ? "hideSubs" : "showSubs"}
            className="btn btn-dark subtitleButton"
            onClick={this.putPlayerCommando}
          >
            {this.state.statusPlayer.showSubs ? (
              <i className="fas fa-closed-captioning"></i>
            ) : (
              <span className="fa-stack">
                <i className="fas fa-closed-captioning fa-stack-1x"></i>
                <i className="fas fa-ban fa-stack-2x" style={{color:"#943d42",opacity:0.7}}></i>
              </span>
            )}
          </button>

          <button 
            type="button"
            title={t("MUTE_UNMUTE")}
            id="mutestatus"
            name="mute"
            className="btn btn-dark volumeButton"
          >
            {
                volume === 0 || this.state.statusPlayer.mutestatus 
                ? <i className="fas fa-volume-mute"></i>
                : (
                  volume > 66
                    ? <i className="fas fa-volume-up"></i>
                    : (
                      volume > 33
                        ? <i className="fas fa-volume-down"></i>
                        : <i className="fas fa-volume-off"></i>
                    )
                )
            }
            <input
              title={t("VOLUME_LEVEL")}
              namecommand="setVolume"
              id="volume"
              defaultValue={volume}
              type="range"
              onMouseLeave={this.putPlayerCommando}
            />
          </button>
          

          

          <div className="header-group switchs">
            <RadioButton
              title={t("SWITCH_PRIVATE")}
              name="Karaoke.Private"
              buttons={[
                {
                  label:t("PRIVATE"),
                  active:this.state.privateMode,
                  activeColor:"#994240",
                  onClick:() => this.saveMode(true),
                  
                },
                {
                  label:t("PUBLIC"),
                  active:!this.state.privateMode,
                  activeColor:"#57bb00",
                  onClick:() => this.saveMode(false),
                  
                }
              ]}
            ></RadioButton>
              <RadioButton
              title={t("SWITCH_OPTIONS")}
              name="optionsButton"
              buttons={[
                {
                  label:t("CL_PLAYLISTS"),
                  active:!this.props.options,
                  onClick:this.props.setOptionMode,
                },
                {
                  label:t("OPTIONS"),
                  active:this.props.options,
                  onClick:this.props.setOptionMode,
                  
                }
              ]}
            ></RadioButton>
          </div>
          <div className="header-group switchs">
            <RadioButton
                title={t("ENGINE_ADDED_SONG_VISIBILITY_ADMIN")}
                name="Playlist.MysterySongs.AddedSongVisibilityAdmin"
                orientation="vertical"
                buttons={[
                  {
                    label:t("ADMIN_PANEL_ADDED_SONG_VISIBILITY_NORMAL"),
                    active:!this.state.songVisibilityOperator,
                    activeColor:"#57bb00",
                    onClick:() => this.saveOperatorAdd(false),
                    
                  },
                  {
                    label:t("ADMIN_PANEL_ADDED_SONG_VISIBILITY_MYSTERY"),
                    active:this.state.songVisibilityOperator,
                    activeColor:"#994240",
                    onClick:() => this.saveOperatorAdd(true),
                    
                  }
                ]}
              ></RadioButton>
          </div>
          <div className="header-group controls">
            <button
              title={t("STOP_AFTER")}
              id="stopAfter"
              namecommand="stopAfter"
              className="btn btn-danger-low"
              onClick={this.putPlayerCommando}
            >
              <i className="fas fa-clock"></i>
            </button>
            <button
              title={t("STOP_NOW")}
              id="stopNow"
              namecommand="stopNow"
              className="btn btn-danger"
              onClick={this.putPlayerCommando}
            >
              <i className="fas fa-stop"></i>
            </button>
            <button
              title={t("REWIND")}
              id="goTo"
              namecommand="goTo"
              defaultValue="0"
              className="btn btn-dark"
              onClick={this.putPlayerCommando}
            >
              <i className="fas fa-backward"></i>
            </button>

            <button
              title={t("PREVIOUS_SONG")}
              id="prev"
              namecommand="prev"
              className="btn btn-default"
              onClick={this.putPlayerCommando}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              title={t("PLAY_PAUSE")}
              id="status"
              namecommand={this.state.statusPlayer.playerStatus === "play" ? "pause" : "play"}
              className="btn btn-primary"
              onClick={this.putPlayerCommando}
            >
              {this.state.statusPlayer.playerStatus === "play" ? (
                <i className="fas fa-pause"></i>
              ) : (
                <i className="fas fa-play"></i>
              )}
            </button>
            <button
              title={t("NEXT_SONG")}
              id="skip"
              namecommand="skip"
              className="btn btn-default"
              onClick={this.putPlayerCommando}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
      </KmAppHeaderDecorator>
    );
  }
}

export default withTranslation()(AdminHeader);
