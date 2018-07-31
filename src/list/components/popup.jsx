import React from 'react';
import Toolbar from './toolbar.jsx';
import Channels from './channels.jsx';
import Context from './context.jsx';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
    getShowContextMenu,
    getContextMenuType
} from '../selectors.js';

const Popup = (props) => {
    let contextMenu;
    if(props.showContextMenu) {
        contextMenu = <Context type={ props.contextMenuType }/>;
    }
    return ( <main className="tabbed">
        <Toolbar/>
        <Channels/>
        { contextMenu }
    </main> );
};
Popup.defaultProps = {
    showContextMenu: false
};
Popup.propTypes /* remove-proptypes */ = {
    showContextMenu: PropTypes.bool,
    contextMenuType: PropTypes.string
};

const mapStateToProps = (state) => ({
    showContextMenu: getShowContextMenu(state),
    contextMenuType: getContextMenuType(state)
});

export default connect(mapStateToProps)(Popup);
