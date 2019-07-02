import React, { Component } from "react";
import { withTranslation } from 'react-i18next';

class RestrictedHelpModal extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        const t = this.props.t;
        return (
            <div className="modal-dialog modal-sm">
                <div className="modal-content">
                    <ul className="nav nav-tabs nav-justified modal-header">
                        <li className="modal-title active"><a data-toggle="tab" href="#nav-help" role="tab"
                            aria-controls="nav-login" aria-selected="true" style={{ fontWeight: 'bold'}}> {t("WEBAPPMODE_LIMITED_NAME")} </a></li>
                    </ul>
                    <div className="tab-content" id="nav-tabContent-help">
                        <div id="nav-help" role="tabpanel" aria-labelledby="nav-help-tab" className="modal-body tab-pane fade in active">
                            <div className="text">
                                {t("CL_HELP_PUBLIC_MOBILE_RESTRICTED")}
                            </div>
                            <div className="text">
                                {t("CL_HELP_PUBLIC_MOBILE_RESTRICTED_DESCRIPTION")}
                            </div>
                            <div className="modal-message">
                                <button data-dismiss="modal" className="btn btn-default confirm">
                                    <i className="glyphicon glyphicon-ok"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default withTranslation()(RestrictedHelpModal);
