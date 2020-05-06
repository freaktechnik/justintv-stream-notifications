import React from 'react';
import PropTypes from 'prop-types';

const IntegerPref = (props) => (
    <input type="number" min="0" step="1" value={ props.value } placeholder={ props.defaultValue } onInput={ props.onChange }/>
);

IntegerPref.propTypes = {
    value: PropTypes.number,
    defaultValue: PropTypes.number.isRequired
    onChange: PropTypes.func
};

export default IntegerPref;
