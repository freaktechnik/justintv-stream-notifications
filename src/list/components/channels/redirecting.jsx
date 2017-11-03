import React from 'react';
import PropTypes from 'prop-types';
import CompactChannel from './compact-channel.jsx';

export const redirectorsShape = PropTypes.arrayOf(PropTypes.shape({
    uname: PropTypes.string.isRequired,
    image: PropTypes.objectOf(PropTypes.string).isRequired,
    id: PropTypes.number.isRequired
}));

const Redirecting = (props) => {
    const channels = props.channels.map((ch) => {
        const onClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            props.onRedirectorClick(ch.id);
        };
        return ( <CompactChannel { ...ch } onClick={ onClick } key={ ch.uname }/> );
    });
    return ( <span className="redirecting">
        <ul className="redirectors inline-list">
            { channels }
        </ul>
        →
    </span> );
};
Redirecting.propTypes = {
    channels: redirectorsShape.isRequired,
    onRedirectorClick: PropTypes.func.isRequired
};

export default Redirecting;
