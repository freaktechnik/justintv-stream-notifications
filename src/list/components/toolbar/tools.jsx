import React from 'react';
import PropTypes from 'prop-types';
import Tool from './tool.jsx';
import KeyHandler, {
    KEYDOWN
} from 'react-key-handler';
import storeTypes from '../../constants/store-types.json';

const Tools = (props) =>
    //TODO CTRL+F and CTRL+R get captured hard by Firefox, no idea how to get around that.
    ( <ul className="toolbar inline-list right" role="toolbar">
        <KeyHandler keyValue="F5" keyEventName={ KEYDOWN } onKeyHandle={ (e) => {
            e.preventDefault();
            e.stopPropagation();
            props.onToolClick("refresh");
        } }/>
        <Tool title="panel_search" icon="magnifying-glass" onClick={ () => props.onToolClick(storeTypes.TOGGLE_SEARCH) } active={ props.searching }/>
        <Tool title="panel_sort" icon="elevator" onClick={ () => props.onToolClick(storeTypes.TOGGLE_SORT) } active={ props.sorting }/>
        <Tool title="panel_refresh" icon="reload" onClick={ () => props.onToolClick("refresh") } className={ props.queuePaused ? "" : "loading" } onContextMenu={ props.onRefreshContextMenu } aria-keyshortcuts="F5"/>
        <Tool title="panel_manage" icon="wrench" onClick={ () => props.onToolClick("configure") }/>
    </ul> );
Tools.defaultProps = {
    searching: false,
    sorting: false
};
Tools.propTypes = {
    onToolClick: PropTypes.func.isRequired,
    queuePaused: PropTypes.bool,
    searching: PropTypes.bool,
    sorting: PropTypes.bool,
    onRefreshContextMenu: PropTypes.func.isRequired
};

export default Tools;
