import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../icon.jsx';

const Extra = (props) => ( <li className={ `${props.type}Wrapper hide-offline` }>
    <Icon type={ Extra.ICONS[props.type] }/>&nbsp;<span className={ props.type }>{ props.children }</span>
</li> );
Extra.ICONS = Object.freeze({
    "viewers": "eye",
    "category": "tag",
    "provider": "hard-drive",
    "uptime": "clock",
    "liveState_-1": "power-standby", //media-pause
    "liveState_0": "audio", //media-record
    "liveState_2": "loop"
});
Extra.propTypes = {
    type: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired
};

export default Extra;
