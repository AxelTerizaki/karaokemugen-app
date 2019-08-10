import React, { Component } from "react";
import { withTranslation } from 'react-i18next';

class RestrictedHelpModal extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div className="modal modalPage fade" id="restrictedHelpModal" hidden>
                <div className="modal-dialog modal-sm">
                    <div className="modal-content">
                        <ul className="nav nav-tabs nav-justified modal-header">
                            <li className="modal-title active"><a style={{ fontWeight: 'bold' }}> {this.props.t("WEBAPPMODE_LIMITED_NAME")} </a></li>
                        </ul>
                        <div className="tab-content" id="nav-tabContent-help">
                            <div id="nav-help" className="modal-body">
                                <div className="text">
                                    {this.props.t("CL_HELP_PUBLIC_MOBILE_RESTRICTED")}
                                </div>
                                <div className="text">
                                    {this.props.t("CL_HELP_PUBLIC_MOBILE_RESTRICTED_DESCRIPTION")}
                                </div>
                                <div className="modal-message">
                                    <button className="btn btn-default confirm">
                                        <i className="glyphicon glyphicon-ok"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default withTranslation()(RestrictedHelpModal);
