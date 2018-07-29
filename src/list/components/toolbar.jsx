import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import TabStrip from './toolbar/tab-strip.jsx';
import Tools from './toolbar/tools.jsx';
import SearchField from './toolbar/search-field.jsx';
import prefs from '../../prefs.json';
import storeTypes from '../constants/store-types.json';
import {
    LIVE_TAB,
    NONLIVE_TAB,
    OFFLINE_TAB
} from '../constants/tabs.json';
import { getChannelCount } from '../utils.js';
import SortBar from './toolbar/sort-bar.jsx';

const DISPLAY_NONLIVE = parseInt(prefs.panel_nonlive.options.find((o) => o.label === "Distinct").value, 10);

const Toolbar = (props) => {
    const searchField = [];
    if(props.showSearch) {
        searchField.push(<SearchField value={ props.query } onSearch={ props.onSearch } key="search"/>);
    }
    if(props.showSort) {
        searchField.push(<SortBar sortField={ props.sortField } sortDirection={ props.sortDirection } onSortChange={ props.onSortChange } onReverseOrder={ () => props.onReverseOrder(!props.sortDirection) } activeTab={ props.activeTab } key="sort"/>);
    }
    return ( <nav>
        <div className="topbar">
            <TabStrip active={ props.activeTab } showNonlive={ props.showNonlive } onTabSelect={ props.onTabSelect } hasFocus={ props.tabsFocused } counts={ props.counts }/>
            <Tools onToolClick={ props.onToolClick } queuePaused={ props.queuePaused } searching={ props.showSearch } onRefreshContextMenu={ props.onRefreshContextMenu }/>
        </div>
        { searchField }
    </nav> );
};
Toolbar.defaultProps = {
    activeTab: LIVE_TAB,
    showNonlive: false,
    query: "",
    showSearch: false,
    tabsFocused: false,
    showSort: false
};
Toolbar.propTypes /* remove-proptypes */ = {
    activeTab: PropTypes.number,
    showNonlive: PropTypes.bool,
    onTabSelect: PropTypes.func.isRequired,
    onToolClick: PropTypes.func.isRequired,
    query: PropTypes.string,
    showSearch: PropTypes.bool,
    queuePaused: PropTypes.bool,
    onSearch: PropTypes.func.isRequired,
    onRefreshContextMenu: PropTypes.func.isRequired,
    tabsFocused: PropTypes.bool,
    counts: PropTypes.shape({
        live: PropTypes.number,
        nonlive: PropTypes.number,
        offline: PropTypes.number
    }),
    showSort: PropTypes.bool,
    sortField: PropTypes.string.isRequired,
    sortDirection: PropTypes.bool.isRequired,
    onReverseOrder: PropTypes.func.isRequired,
    onSortChange: PropTypes.func.isRequired
};

const mapStateToProps = (state) => ({
    activeTab: state.ui.tab,
    showNonlive: state.settings.nonLiveDisplay === DISPLAY_NONLIVE,
    query: state.ui.query,
    showSearch: state.ui.search,
    queuePaused: state.settings.queue.paused || !state.settings.queue.status,
    tabsFocused: !state.ui.search && !state.ui.contextChannel && !state.ui.queueContext,
    counts: state.ui.badges ? {
        live: getChannelCount(state, LIVE_TAB),
        nonlive: state.ui.nonLiveDisplay === DISPLAY_NONLIVE ? getChannelCount(state, NONLIVE_TAB) : undefined,
        offline: getChannelCount(state, OFFLINE_TAB)
    } : {},
    showSort: state.ui.sorting,
    sortField: state.ui.sortField,
    sortDirection: state.ui.sortDirection
});
const mapDispatchToProps = (dispatch) => ({
    onTabSelect(index) {
        dispatch({
            type: storeTypes.SET_TAB,
            payload: index
        });
    },
    onToolClick(tool) {
        //TODO actually, most of this handler shouldn't be in here, there should just be dispatching here
        if(tool === storeTypes.TOGGLE_SEARCH || tool === storeTypes.TOGGLE_SORT) {
            dispatch({ type: tool });
        }
        else if(tool === "refresh") {
            dispatch({
                type: storeTypes.LOADING,
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
            type: storeTypes.SEARCH,
            payload: event.target.value
        });
    },
    onRefreshContextMenu(e) {
        e.preventDefault();
        e.stopPropagation();
        dispatch({
            type: storeTypes.OPEN_QUEUE_CONTEXT
        });
    },
    onSortChange(e) {
        dispatch({
            type: storeTypes.SET_SORT_FIELD,
            payload: e.target.value
        });
    },
    onReverseOrder(direction) {
        dispatch({
            type: storeTypes.SET_SORT_DIRECTION,
            payload: direction
        });
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(Toolbar);
