import React from 'react';
import PropTypes from 'prop-types';
import Tool from './tool.jsx';
import KeyHandler, {
    KEYPRESS
} from 'react-key-handler';

const Tools = (props) =>
    //TODO CTRL+F and CTRL+R get captured hard by Firefox, no idea how to get around that.
    ( <ul className="toolbar inline-list right" role="toolbar">
        <KeyHandler keyValue="F5" keyEventName={ KEYPRESS } onKeyHandle={ (e) => {
            e.preventDefault();
            e.stopPropagation();
            props.onToolClick("refresh");
        } }/>
        <Tool title="panel_search" icon="magnifying-glass" onClick={ () => props.onToolClick("toggleSearch") } active={ props.searching }/>
        <Tool title="panel_refresh" icon="reload" onClick={ () => props.onToolClick("refresh") } className={ props.queuePaused ? "" : "loading" } onContextMenu={ props.onRefreshContextMenu }/>
        <Tool title="panel_manage" icon="wrench" onClick={ () => props.onToolClick("configure") }/>
    </ul> );
Tools.defaultProps = {
    searching: false
};
Tools.propTypes = {
    onToolClick: PropTypes.func.isRequired,
    queuePaused: PropTypes.bool,
    searching: PropTypes.bool,
    onRefreshContextMenu: PropTypes.func.isRequired
};

export default Tools;
