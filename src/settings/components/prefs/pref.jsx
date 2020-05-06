import React, {
    useMemo,
    useCallback
} from 'react';
import PropTypes from 'prop-types';
import {
    useSelector,
    useDispatch
} from 'react-redux';
import RadioPref from './radio-pref.jsx';
import BoolPref from './bool-pref.jsx';
import StringPref from './string-pref.jsx';
import IntegerPref from './integer-pref.jsx';

const _ = browser.i18n.getMessage;

//TODO dispatch when value changes

const makeValueSelector = () => {
    return (state, props) => state.options[props.id];
};

const Pref = (props) => {
    const dispatch = useDispatch();
    const selectValue = useMemo(makeValueSelector, []);
    const value = useSelector((state) => selectValue(state, props));
    const onChange = useCallback((event) => dispatch({
        type: props.id,
        payload: event.target.value
    }), [
        dispatch,
        props
    ]);
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

    const description = _(`${props.id}_description`);

    return (
        <div className="panel-formElements-item browser-style">
            <div className="label">
                <label className="browser-style-label" htmlFor={ props.id }>{ _(`${props.id}_title`) }</label>
                { description !== '' && (<small>{ description }</small>) }
            </div>
            <PrefComponent { ...props } value={ (value !== props.defaultValue && value) || undefined } onChange={ onChange }/>
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
