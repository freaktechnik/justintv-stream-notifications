import React from 'react';
import Pref from '../prefs/pref.jsx';
import prefTypes from '../../../prefs.json';

//TODO hidden prefs as separate section

export const Options = () => {
    const options = Object.entries(prefTypes).map(([
        key,
        definition
    ]) => {
        return (<Pref id={ key } key={ key } { ...definition }/>);
    });
    return (
        <div className="panel">
            { options }
        </div>
    );
};

export default Options;
