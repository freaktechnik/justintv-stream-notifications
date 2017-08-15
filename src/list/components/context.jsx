import { CompactChannel } from './channels.jsx';
import PropTypes from 'prop-types';
import React from 'react';

const ContextItem = (props) => {
    return ( <li><button onClick={ props.onClick }>{ _(props.label) }</button></li> );
};
ContextItem.propTypes = {
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func
};

/**
 * < | Channel Name
 * --------------------
 * Open Channel
 * Open Channel Archive
 * Open redirector A
 * Open redirector B
 * Open chat
 * Update channel
 * Add/Remove channel
 * Copy URL
 */
const ContextPanel = (props) => {
    const items = [];
    if(props.hasChat && props.liveState !== LiveState.OFFLINE) {
        items.push(<ContextItem label="context_chat"/>);
    }
    if(props.external) {
        items.push(<ContextItem label="context_add"/>);
    }
    else {
        items.push(<ContextItem label="context_remove"/>);
    }
    return ( <dialog className="context-panel">
        <h1>{ props.uname }</h1>
        <ul>
            <ContextItem label="openChannel"/>
            <ContextItem label="context_open"/>
            <ContextItem label="context_refresh"/>
            { items }
            <ContextItem label="context_copy"/>
        </ul>
    </dialog> );
};
ContextPanel.propTypes = {
    uname: PropTypes.string.isRequired,
    external: PropTypes.bool.isRequired,
    liveState: PropTypes.oneOf(Object.keys(liveState)),
    redirectors: PropTypes.shape(CompactChannel.propType),
    hasChat: PropTypes.bool.isRequired
};

export default ContextPanel;
