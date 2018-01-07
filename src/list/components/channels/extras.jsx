import React from 'react';
import PropTypes from 'prop-types';
import Extra from './extra.jsx';

const HOUR = 60;
const MS_TO_MIN = 60000;
const TWO_DIGITS = 10;
const EMPTY = 0;

const getDifference = (timestamp) => {
    const diff = Math.floor((Date.now() - timestamp) / MS_TO_MIN);

    const hours = Math.floor(diff / HOUR);
    const minutes = diff - (hours * HOUR);
    let minuteDigit = '';
    if(minutes < TWO_DIGITS) {
        minuteDigit = '0';
    }
    return `${hours}:${minuteDigit}${minutes}`;
};

const Extras = (props) => {
    const extras = [];
    if("viewers" in props && props.viewers) {
        extras.push(<Extra type="viewers" value={ props.viewers.toString() } key="viewers"/>);
    }
    if(props.category) {
        extras.push(<Extra type="category" value={ props.category } key="category"/>);
    }
    if("liveSince" in props && props.liveSince !== EMPTY) {
        extras.push(<Extra type="uptime" value={ getDifference(props.liveSince) } key="uptime"/>);
    }
    extras.push(<Extra type="provider" value={ props.provider } key="provider"/>);
    return ( <aside><ul className="inline-list">{ extras }</ul></aside> );
};
Extras.propTypes = {
    viewers: PropTypes.number,
    category: PropTypes.string,
    provider: PropTypes.string.isRequired,
    liveSince: PropTypes.number
};

export default Extras;
