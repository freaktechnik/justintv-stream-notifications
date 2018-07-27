import React from 'react';
import PropTypes from 'prop-types';
import Extra from './extra.jsx';
import Since from './since.jsx';

const _ = browser.i18n.getMessage;

const EMPTY = 0;

const Extras = (props) => {
    const extras = [];
    if("viewers" in props && props.viewers) {
        extras.push(<Extra type="viewers" key="viewers">{ props.viewers.toString() }</Extra>);
    }
    if(props.category) {
        extras.push(<Extra type="category" key="category">{ props.category }</Extra>);
    }
    if("liveSince" in props && props.liveSince !== EMPTY) {
        extras.push(<Extra type="uptime" key="uptime">
            <Since>{ props.liveSince }</Since>
        </Extra>);
    }
    if("liveState" in props && props.liveState !== undefined) {
        const liveStateString = props.liveState.toString();
        const liveStateKey = `liveState_${liveStateString}`;
        extras.push(<Extra type={ liveStateKey } key="livestate">{ _(liveStateKey) }</Extra>);
    }
    extras.push(<Extra type="provider" key="provider">{ props.provider }</Extra>);
    return ( <aside><ul className="inline-list">{ extras }</ul></aside> );
};
Extras.propTypes = {
    viewers: PropTypes.number,
    category: PropTypes.string,
    provider: PropTypes.string.isRequired,
    liveSince: PropTypes.number,
    liveState: PropTypes.number
};

export default Extras;
