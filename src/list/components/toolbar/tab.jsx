import React from 'react';
import PropTypes from 'prop-types';
import TabButton from '../../../content/components/tab.jsx';

const NO_CHANNELS = 0;

const Tab = (props) => {
    let badge;
    if(props.count || props.count === NO_CHANNELS) {
        badge = ( <span className="badge">{ props.count }</span> );
    }
    return (<TabButton {...props}>{ badge }</TabButton>);
};
Tab.defaultProps = {
    active: false,
    count: undefined
};

Tab.propTypes = {
    title: PropTypes.string.isRequired,
    onClick: PropTypes.func,
    focused: PropTypes.bool.isRequired,
    onFocusChange: PropTypes.func.isRequired,
    count: PropTypes.number
};

export default Tab;
