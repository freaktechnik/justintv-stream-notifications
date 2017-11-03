import React from 'react';
import PropTypes from 'prop-types';
import Tab from './tab.jsx';
import NavigateableList from '../navigateable-list.jsx';
import { LIVE_TAB, NONLIVE_TAB, OFFLINE_TAB, EXTRAS_TAB } from '../../constants/tabs.json';

//TODO space or enter should focus tab panel.

class TabStrip extends NavigateableList {
    static get defaultProps() {
        return {
            active: LIVE_TAB,
            showNonlive: false
        };
    }

    static get propTypes() {
        return {
            active: PropTypes.number,
            showNonlive: PropTypes.bool,
            onTabSelect: PropTypes.func.isRequired
        };
    }

    render() {
        const children = [ <Tab title="panel_tab_live" onClick={ () => this.props.onTabSelect(LIVE_TAB) } active={ this.props.active === LIVE_TAB } key={ LIVE_TAB }/> ];
        if(this.props.showNonlive) {
            children.push(<Tab title="panel_tab_nonlive" onClick={ () => this.props.onTabSelect(NONLIVE_TAB) } active={ this.props.active === NONLIVE_TAB } key={ NONLIVE_TAB }/>);
        }
        children.push(<Tab title="panel_tab_offline" onClick={ () => this.props.onTabSelect(OFFLINE_TAB) } active={ this.props.active === OFFLINE_TAB } key={ OFFLINE_TAB }/>);
        children.push(<Tab title="panel_tab_explore" onClick={ () => this.props.onTabSelect(EXTRAS_TAB) } active={ this.props.active === EXTRAS_TAB } key={ EXTRAS_TAB }/>);

        const element = super.render();
        return React.cloneElement(element, {
            className: "tabstrip inline-list",
            role: "tablist"
        }, ...this.mapChildren(children));
    }
}

export default TabStrip;
