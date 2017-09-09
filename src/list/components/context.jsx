import PropTypes from 'prop-types';
import React from 'react';
import ChannelContextPanel from './channel-context.jsx';
import QueueContextPanel from './queue-context.jsx';

const ContextPanel = (props) => {
    if(props.type === 'queue') {
        return ( <QueueContextPanel/> );
    }
    else if(props.type === 'channel') {
        return ( <ChannelContextPanel/> );
    }
    return [];
};
ContextPanel.propTypes = {
    type: PropTypes.oneOf([
        'channel',
        'queue'
    ])
};

export default ContextPanel;
