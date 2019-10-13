import React from 'react';
import PropTypes from 'prop-types';

const BoolPref = (props) => (
    <div className="browser-style">
        <input type="checkbox" checked={ props.value || props.defaultValue }/>
    </div>
);

BoolPref.propTypes = {
    value: PropTypes.bool.isRequired,
    defaultValue: PropTypes.bool.isRequired
};
//TODO change listener

export default BoolPref;
