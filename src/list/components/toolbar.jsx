import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import TabStrip from './toolbar/tab-strip.jsx';
import Tools from './toolbar/tools.jsx';
import SearchField from './toolbar/search-field.jsx';
import prefs from '../../prefs.json';
import storeTypes from '../constants/store-types.json';
import { LIVE_TAB } from '../constants/tabs.json';

const DISPLAY_NONLIVE = parseInt(prefs.panel_nonlive.options.find((o) => o.label === "Distinct").value, 10);

const Toolbar = (props) => {
    let searchField;
    if(props.showSearch) {
        searchField = <SearchField value={ props.query } onSearch={ props.onSearch }/>;
    }
    return ( <nav>
        <div className="topbar">
            <TabStrip active={ props.activeTab } showNonlive={ props.showNonlive } onTabSelect={ props.onTabSelect } hasFocus={ props.tabsFocused }/>
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
    tabsFocused: false
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
    tabsFocused: PropTypes.bool
};

const mapStateToProps = (state) => ({
    activeTab: state.ui.tab,
    showNonlive: state.settings.nonLiveDisplay === DISPLAY_NONLIVE,
    query: state.ui.query,
    showSearch: state.ui.search,
    queuePaused: state.settings.queue.paused || !state.settings.queue.status,
    tabsFocused: !state.ui.search && !state.ui.contextChannel && !state.ui.queueContext
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
        if(tool === "toggleSearch") {
            dispatch({ type: storeTypes.TOGGLE_SEARCH });
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
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(Toolbar);
