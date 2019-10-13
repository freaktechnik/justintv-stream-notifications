import React from 'react';
import PropTypes from 'prop-types';

const IntegerPref = (props) => (
    <input type="number" min="0" step="1" value={ props.value } placeholder={ props.defaultValue }/>
);

IntegerPref.propTypes = {
    value: PropTypes.number.isRequired,
    defaultValue: PropTypes.number.isRequired
};
//TODO change listener

export default IntegerPref;
