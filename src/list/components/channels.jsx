import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { LIVE_TAB, NONLIVE_TAB, OFFLINE_TAB, EXTRAS_TAB } from '../constants/tabs.json';
import ChannelList, { channelsShape } from './channel-list.jsx';
import ProviderSelector from './provider-selector.jsx';
import storeTypes from '../constants/store-types.json';
import { getVisibleChannels } from '../utils';

const _ = browser.i18n.getMessage;

const Channels = (props) => {
    let select;
    if(props.type === EXTRAS_TAB) {
        select = <ProviderSelector providers={ props.providers } currentProvider={ props.currentProvider } onProvider={ props.onProvider }/>;
        if(props.loading) {
            return ( <div className="loading tabcontent">
                { select }
                <div>{ _('panel_loading') }</div>
            </div> );
        }
    }
    if(!props.channels.length) {
        if(props.searching && props.type !== EXTRAS_TAB) {
            return ( <div className="tabcontent">{ _('panel_no_results') }</div> );
        }
        else if(props.type === LIVE_TAB) {
            return ( <div className="tabcontent">{ _('panel_nothing_live') }</div> );
        }
        else if(props.type === OFFLINE_TAB) {
            return ( <div className="tabcontent">{ _('panel_nothing') }</div> );
        }
        else if(props.type === EXTRAS_TAB) {
            return ( <div className="tabcontent">
                { select }
                <div>{ _('panel_no_results') }</div>
            </div> );
        }
    }
    return ( <div className={ `type${props.type} tabcontent` }>
        { select }
        <ChannelList channels={ props.channels } onChannel={ props.onChannel } onExternalChannel={ props.onExternalChannel } onContext={ props.onContext } onCopy={ props.onCopy }/>
    </div> );
};
Channels.defaultProps = {
    loading: false,
    searching: false,
    theme: 'light'
};
Channels.propTypes = {
    channels: channelsShape.isRequired,
    type: PropTypes.oneOf([
        LIVE_TAB,
        NONLIVE_TAB,
        OFFLINE_TAB,
        LIVE_TAB
    ]).isRequired,
    loading: PropTypes.bool,
    providers: PropTypes.objectOf(PropTypes.object).isRequired,
    currentProvider: PropTypes.string,
    onProvider: PropTypes.func.isRequired,
    searching: PropTypes.bool,
    onChannel: PropTypes.func.isRequired,
    onExternalChannel: PropTypes.func.isRequired,
    onContext: PropTypes.func.isRequired,
    onCopy: PropTypes.func.isRequired
};

const mapStateToProps = (state) => ({
    channels: getVisibleChannels(state),
    extras: state.settings.extras,
    style: state.settings.style,
    type: state.ui.tab,
    nonLiveDisplay: state.settings.nonLiveDisplay,
    providers: state.providers,
    loading: state.ui.loading,
    currentProvider: state.ui.currentProvider,
    searching: state.ui.search && !!state.ui.query.length
});
const mapDispatchToProps = (dispatch) => ({
    onProvider(event) {
        dispatch({
            type: storeTypes.SET_PROVIDER,
            payload: event.target.value,
            command: "explore"
        });
    },
    onChannel(channelId) {
        dispatch({
            command: "open",
            payload: channelId
        });
        window.close();
    },
    onExternalChannel(url) {
        dispatch({
            command: "openUrl",
            payload: url
        });
        window.close();
    },
    onContext(channel) {
        dispatch({
            type: storeTypes.SET_CONTEXT_CHANNEL,
            payload: channel
        });
    },
    onCopy(payload) {
        dispatch({
            type: storeTypes.COPY,
            payload
        });
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(Channels);
