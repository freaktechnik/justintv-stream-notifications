import React from 'react';
import PropTypes from 'prop-types';

const BoolPref = (props) => (
    <div className="browser-style">
        <input type="checkbox" checked={ props.value || props.defaultValue } onChange={ props.onChange }/>
    </div>
);

BoolPref.propTypes = {
    value: PropTypes.bool,
    defaultValue: PropTypes.bool.isRequired,
    onChange: PropTypes.func
};

export default BoolPref;
