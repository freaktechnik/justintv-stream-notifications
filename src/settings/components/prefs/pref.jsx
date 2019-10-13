import React from 'react';
import PropTypes from 'prop-types';
import RadioPref from './radio-pref.jsx';
import BoolPref from './bool-pref.jsx';
import StringPref from './string-pref.jsx';
import IntegerPref from './integer-pref.jsx';

const _ = browser.i18n.getMessage;

const Pref = (props) => {
    let PrefComponent = StringPref;
    if(props.type === 'radio') {
        PrefComponent = RadioPref;
    }
    else if(props.type === 'bool') {
        PrefComponent = BoolPref;
    }
    else if(props.type === 'integer') {
        PrefComponent = IntegerPref;
    }

    const description = _(`${props.id}_descrtiption`);

    return (
        <div className="panel-formElements-item browser-style">
            <div className="label">
                <label className="browser-style-label" htmlFor={ props.id }>{ _(`${props.id}_title`) }</label>
                { description !== '' && (<small>{ description }</small>) }
            </div>
            <PrefComponent { ...props }/>
        </div>
    );
};

Pref.defaultProps = {
    hideDefault: false
};

Pref.propTypes = {
    type: PropTypes.oneOf([
        'radio',
        'bool',
        'integer',
        'string'
    ]).isRequired,
    id: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.bool
    ]).isRequired,
    defaultValue: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.bool
    ]),
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.string,
        label: PropTypes.string
    })),
    hideDefault: PropTypes.bool
};

export default Pref;
