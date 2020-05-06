import React from 'react';
import PropTypes from 'prop-types';
const _ = browser.i18n.getMessage;

const PREF_VALUE_HIDDEN = 'pref_value_hidden';

const StringPref = (props) => (
    <input type="text" value={ props.value } placeholder={ props.hideDefault ? _(PREF_VALUE_HIDDEN) : props.defaultValue } onInput={ props.onChange }/>
);

StringPref.defaultProps = {
    hideDefault: false
};

StringPref.propTypes = {
    value: PropTypes.string,
    hideDefault: PropTypes.bool,
    defaultValue: PropTypes.string.isRequired,
    onChange: PropTypes.func
};

export default StringPref;
