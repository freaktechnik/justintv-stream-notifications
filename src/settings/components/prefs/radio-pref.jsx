import React from 'react';
import PropTypes from 'prop-types';
const _ = browser.i18n.getMessage;

const RadioPref = (props) => {
    const value = props.value || props.defaultValue;
    return (
        <select className="browser-style">
            { props.options.map((option) => (<option key={ option.label } selected={ option.value === value } value={ option.value }>{ _(`${props.id}_options_${option.label}`) }</option>)) }
        </select>
    );
};

RadioPref.propTypes = {
    id: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    defaultValue: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.string,
        label: PropTypes.string
    })).isRequired
};
//TODO change listener

export default RadioPref;
