import React from 'react';
import PropTypes from 'prop-types';
import Extra from './extra.jsx';

const Extras = (props) => {
    const extras = [];
    if("viewers" in props && props.viewers) {
        extras.push(<Extra type="viewers" value={ props.viewers.toString() } key="viewers"/>);
    }
    if(props.category) {
        extras.push(<Extra type="category" value={ props.category } key="category"/>);
    }
    extras.push(<Extra type="provider" value={ props.provider } key="provider"/>);
    return ( <aside><ul className="inline-list">{ extras }</ul></aside> );
};
Extras.propTypes = {
    viewers: PropTypes.number,
    category: PropTypes.string,
    provider: PropTypes.string.isRequired
};

export default Extras;
