import React from 'react';
import PropTypes from 'prop-types';
import Tab from './tab.jsx';
import NavigateableList from '../navigateable-list.jsx';
import {
    LIVE_TAB, NONLIVE_TAB, OFFLINE_TAB, EXPLORE_TAB
} from '../../constants/tabs.json';

//TODO space or enter should focus tab panel.

const TabStrip = (props) => {
    const nonlive = [];
    let focused = props.active;
    if(props.showNonlive) {
        nonlive.push( <Tab title="panel_tab_nonlive" onClick={ () => props.onTabSelect(NONLIVE_TAB) } key={ NONLIVE_TAB } count={ props.counts.nonlive }/> );
    }
    else if(focused >= NONLIVE_TAB) {
        // Skip the non live tab when it's not shown
        --focused;
    }

    // Maps selected index to tab id
    const onFocusChange = (index) => {
        if(!props.showNonlive && index >= NONLIVE_TAB) {
            ++index;
        }
        props.onTabSelect(index);
    };

    return (
        <NavigateableList className="tabstrip inline-list" role="tablist" focused={ focused } onFocusChange={ onFocusChange } hasFocus={ props.hasFocus }>
            <Tab title="panel_tab_live" onClick={ () => props.onTabSelect(LIVE_TAB) } key={ LIVE_TAB } count={ props.counts.live }/>
            { nonlive }
            <Tab title="panel_tab_offline" onClick={ () => props.onTabSelect(OFFLINE_TAB) } key={ OFFLINE_TAB } count={ props.counts.offline }/>
            <Tab title="panel_tab_explore" onClick={ () => props.onTabSelect(EXPLORE_TAB) } key={ EXPLORE_TAB }/>
        </NavigateableList>
    );
};
TabStrip.defaultProps = {
    active: LIVE_TAB,
    showNonlive: false,
    hasFocus: false,
    counts: {}
};
TabStrip.propTypes = {
    active: PropTypes.number,
    showNonlive: PropTypes.bool,
    onTabSelect: PropTypes.func.isRequired,
    hasFocus: PropTypes.bool,
    counts: PropTypes.shape({
        live: PropTypes.number,
        nonlive: PropTypes.number,
        offline: PropTypes.number
    })
};

export default TabStrip;
