import React from 'react';
import PropTypes from 'prop-types';
import NavigateableList from './navigateable-list.jsx';

const TabStrip = (props) => {
    return (
        <NavigateableList className="tabstrip inline-list" role="tablist" focused={ props.active } onFocusChange={ props.onTabSelect } hasFocus={ props.hasFocus }>
            { props.children }
        </NavigateableList>
    );
};
TabStrip.defaultProps = {
    active: 0,
    hasFocus: false
};
TabStrip.propTypes = {
    active: PropTypes.number,
    onTabSelect: PropTypes.func.isRequired,
    hasFocus: PropTypes.bool,
    children: PropTypes.element
};

export default TabStrip;
