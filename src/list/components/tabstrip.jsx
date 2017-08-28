import React from 'react';
import PropTypes from 'prop-types';
import Icon from './icon.jsx';
import { connect } from 'react-redux';

const _ = browser.i18n.getMessage;

const Tab = (props) => {
    let className;
    if(props.active) {
        className = "current";
    }
    return ( <li role="presentation"><button role="tab" onClick={ props.onClick } className={ className }>{ _(props.title) }</button></li> );
};
Tab.defaultProps = {
    active: false
};
Tab.propTypes = {
    title: PropTypes.string.isRequired,
    onClick: PropTypes.func,
    active: PropTypes.bool
};

const TabStrip = (props) => {
    let nonlive;
    if(props.showNonlive) {
        nonlive = <Tab title="panel_tab_nonlive" onClick={ ()=> props.onTabSelect(1) } active={ props.active === 1 }/>;
    }
    return ( <ul className="tabstrip inline-list" role="tablist">
        <Tab title="panel_tab_live" onClick={ () => props.onTabSelect(0) } active={ props.active === 0 }/>
        { nonlive }
        <Tab title="panel_tab_offline" onClick={ () => props.onTabSelect(2) } active={ props.active === 2 }/>
        <Tab title="panel_tab_explore" onClick={ () => props.onTabSelect(3) } active={ props.active === 3 }/>
    </ul> );
};
TabStrip.defaultProps = {
    active: 0,
    showNonlive: false
};
TabStrip.propTypes = {
    active: PropTypes.number,
    showNonlive: PropTypes.bool,
    onTabSelect: PropTypes.func.isRequired
};

const SearchField = (props) => {
    return ( <input className="searchField" type="search" value={ props.value } placeholder={ _('cm_filter.placeholder') } onChange={ props.onSearch }/> );
};
SearchField.defaultProps = {
    value: ""
};
SearchField.propTypes = {
    value: PropTypes.string,
    onSearch: PropTypes.func.isRequired
};

const Tool = (props) => {
    return ( <li>
        <button title={ _(`${props.title}.title`) } onClick={ props.onClick } aria-pressed={ props.active ? "true" : "false" }>
            <Icon type={ props.icon } className={ props.className }/>
        </button>
    </li> );
};
Tool.defaultProps = {
    active: false
};
Tool.propTypes = {
    onClick: PropTypes.func,
    title: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    className: PropTypes.string,
    active: PropTypes.bool
};

const Tools = (props) => {
    //TODO refresh context menu
    return ( <ul className="toolbar inline-list right" role="toolbar">
        <Tool title="panel_search" icon="magnifying-glass" onClick={ () => props.onToolClick("toggleSearch") } active={ props.searching }/>
        <Tool title="panel_refresh" icon="reload" onClick={ props.onToolClick("refresh") } className={ props.queuePaused ? "" : "running" }/>
        <Tool title="panel_manage" icon="wrench" onClick={ () => props.onToolClick("configure") }/>
    </ul> );
};
Tools.defaultProps = {
    searching: false
};
Tools.propTypes = {
    onToolClick: PropTypes.func.isRequired,
    queuePaused: PropTypes.bool,
    searching: PropTypes.bool
};

const Toolbar = (props) => {
    let searchField;
    if(props.showSearch) {
        searchField = <SearchField value={ props.query } onSearch={ props.onSearch }/>;
    }
    return ( <nav>
        <div className="topbar">
            <TabStrip active={ props.activeTab } showNonlive={ props.showNonlive } onTabSelect={ props.onTabSelect }/>
            <Tools onToolClick={ props.onToolClick } queuePaused={ props.queuePaused } searching={ props.showSearch }/>
        </div>
        { searchField }
    </nav> );
};
Toolbar.defaultProps = {
    activeTab: 0,
    showNonlive: false,
    query: "",
    showSearch: false,
};
Toolbar.propTypes = {
    activeTab: PropTypes.number,
    showNonlive: PropTypes.bool,
    onTabSelect: PropTypes.func.isRequired,
    onToolClick: PropTypes.func.isRequired,
    query: PropTypes.string,
    showSearch: PropTypes.bool,
    queuePaused: PropTypes.bool,
    onSearch: PropTypes.func.isRequired
};

const mapStateToProps = (state) => {
    return {
        activeTab: state.ui.tab,
        showNonlive: state.settings.nonLiveDisplay === 1,
        query: state.ui.query,
        showSearch: state.ui.search,
        queuePaused: state.settings.queue.paused
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        onTabSelect(index) {
            dispatch({ type: "setTab", payload: index });
        },
        onToolClick(tool) {
            //TODO actually, most of this handler shouldn't be in here, there should just be dispatching here
            if(tool === "toggleSearch") {
                dispatch({ type: "toggleSearch" });
            }
            else if(tool === "refresh") {
                dispatch({
                    type: "loading",
                    command: "refresh"
                });
            }
            else {
                dispatch({
                    command: tool
                });
                if(tool === "configure") {
                    window.close();
                }
            }
        },
        onSearch(event) {
            dispatch({
                type: "search",
                payload: event.target.value
            });
        }
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Toolbar);
