import React from 'react';
import PropTypes from 'prop-types';
import Tab from './tab.jsx';
import NavigateableList from '../navigateable-list.jsx';
import { LIVE_TAB, NONLIVE_TAB, OFFLINE_TAB, EXPLORE_TAB } from '../../constants/tabs.json';

//TODO space or enter should focus tab panel.

const TabStrip = (props) => {
    const nonlive = [];
    if(props.showNonlive) {
        nonlive.push( <Tab title="panel_tab_nonlive" onClick={ () => props.onTabSelect(NONLIVE_TAB) } active={ props.active === NONLIVE_TAB } key={ NONLIVE_TAB }/> );
    }
    return (
        <NavigateableList className="tabstrip inline-list" role="tablist">
            <Tab title="panel_tab_live" onClick={ () => props.onTabSelect(LIVE_TAB) } active={ props.active === LIVE_TAB } key={ LIVE_TAB }/>
            { nonlive }
            <Tab title="panel_tab_offline" onClick={ () => props.onTabSelect(OFFLINE_TAB) } active={ props.active === OFFLINE_TAB } key={ OFFLINE_TAB }/>
            <Tab title="panel_tab_explore" onClick={ () => props.onTabSelect(EXPLORE_TAB) } active={ props.active === EXPLORE_TAB } key={ EXPLORE_TAB }/>
        </NavigateableList>
    );
};
TabStrip.defaultProps = {
    active: LIVE_TAB,
    showNonlive: false
};
TabStrip.propTypes = {
    active: PropTypes.number,
    showNonlive: PropTypes.bool,
    onTabSelect: PropTypes.func.isRequired
};

export default TabStrip;
