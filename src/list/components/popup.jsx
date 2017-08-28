import React from 'react';
import TabStrip from './tabstrip.jsx';
import Channels from './channels.jsx';
import Context from './context.jsx';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

const Popup = (props) => {
    let contextMenu;
    if(props.showContextMenu) {
        contextMenu = <Context/>;
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
    showContextMenu: PropTypes.bool
};

const mapStateToProps = (state) => {
    return {
        showContextMenu: !!state.ui.contextChannel
    };
};

export default connect(mapStateToProps)(Popup);
