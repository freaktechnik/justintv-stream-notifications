import React from 'react';
import PropTypes from 'prop-types';
import TabStrip from './tab-strip.jsx';
import SettingPage from './setting-page.jsx';
import { connect } from 'react-redux';
import storeTypes from '../store-types.json';

const Settings = (props) => (
    <main className="tabbed">
        <TabStrip active={ props.active } onTabSelect={ props.onTabSelect }/>
        <SettingPage active={ props.active }/>
    </main>
);

Settings.propTypes = {
    onTabSelect: PropTypes.func,
    active: PropTypes.bool.isRequired
};

const mapStateToProps = (state) => ({
    active: state.tab
});

const mapDispatchToProps = (dispatch) => ({
    onTabSelect(index) {
        dispatch({
            type: storeTypes.TAB_SELECT,
            payload: index
        });
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
