import React from 'react';
import TabStrip from './tabstrip.jsx';
import Channels from './channels.jsx';
import Context from './context.jsx';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

const Popup = (props) => {
    let contextMenu;
    if(props.showContextMenu) {
        contextMenu = <Context type={ props.contextMenuType }/>;
    }
    return ( <main className="tabbed">
        <TabStrip/>
        <Channels/>
        { contextMenu }
    </main> );
};
Popup.defaultProps = {
    showContextMenu: false
};
Popup.propTypes = {
    showContextMenu: PropTypes.bool,
    contextMenuType: PropTypes.string
};

const mapStateToProps = (state) => {
    let contextMenuType;
    if(state.ui.contextChannel) {
        contextMenuType = 'channel';
    }
    else if(state.ui.queueContext) {
        contextMenuType = 'queue';
    }

    return {
        showContextMenu: !!contextMenuType,
        contextMenuType
    };
};

export default connect(mapStateToProps)(Popup);
