import PropTypes from 'prop-types';
import React from 'react';
import LiveState from '../../../live-state.json';
import { connect } from 'react-redux';
import ContextList from './context-list.jsx';
import ContextItem from './context-item.jsx';
import storeTypes from '../../constants/store-types.json';
import {
    getChannelAction, CHANNEL_ACTIONS, shouldClose
} from '../../state/channel-actions';

//TODO closing the context panel should focus the item it was opened for.

const redirectorsShape = PropTypes.arrayOf(PropTypes.shape({
    uname: PropTypes.string.isRequired,
    id: PropTypes.number.isRequired
}));

/*
 * < | Channel Name
 * --------------------
 * Open Channel
 * Open Channel Archive
 * Open redirector A
 * Open redirector B
 * Open chat
 * Update channel
 * Add/Remove channel
 * Copy URL
 */
const ChannelContextPanel = (props) => {
    const items = [];
    if(props.redirectors && props.redirectors.length) {
        for(const r of props.redirectors) {
            items.push(<ContextItem label="context_redirector" params={ [ r.uname ] } onClick={ () => props.onOpen({
                external: false,
                id: r.id
            }) }/>);
        }
    }
    if(props.hasChat && props.liveState !== LiveState.OFFLINE) {
        items.push(<ContextItem label="context_chat" key="chat" onClick={ () => props.onChat(props) }/>);
    }
    if(props.providerEnabled) {
        if(props.external) {
            items.push(<ContextItem label="context_add" key="add" onClick={ () => props.onAdd(props.id) }/>);
        }
        else {
            if(props.liveState === LiveState.LIVE) {
                items.push(<ContextItem label="context_open" onClick={ () => props.onArchive(props) }/>);
            }
            items.push(<ContextItem label="context_remove" key="remove" onClick={ () => props.onRemove(props.id) }/>);
            items.push(<ContextItem label="context_refresh" onClick={ () => props.onRefresh(props.id) }/>);
        }
    }
    if(props.showLivestreamer) {
        items.push(<ContextItem label="context_livestreamer" onClick={ () => props.onLivestreamer(props) }/>);
    }
    return ( <ContextList title={ props.uname } onClose={ props.onClose } focused={ props.focused } onFocusChange={ props.onFocusChange }>
        <ContextItem label="openChannel" onClick={ () => props.onOpen(props) }/>
        { items }
        <ContextItem label="context_copy" onClick={ () => props.onCopy({
            url: props.url,
            uname: props.uname
        }) }/>
    </ContextList> );
};
ChannelContextPanel.defaultProps = {
    providerEnabled: true,
    showLivestreamer: false,
    focused: 0
};
ChannelContextPanel.propTypes /* remove-proptypes */ = {
    uname: PropTypes.string.isRequired,
    external: PropTypes.bool.isRequired,
    liveState: PropTypes.oneOf(Object.keys(LiveState)),
    redirectors: redirectorsShape,
    hasChat: PropTypes.bool.isRequired,
    id: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
    ]).isRequired,
    providerEnabled: PropTypes.bool,
    focused: PropTypes.number,
    onOpen: PropTypes.func,
    onChat: PropTypes.func,
    onAdd: PropTypes.func,
    onCopy: PropTypes.func,
    onRemove: PropTypes.func,
    onClose: PropTypes.func.isRequired,
    onArchive: PropTypes.func,
    onRefresh: PropTypes.func,
    onLivestreamer: PropTypes.func,
    url: PropTypes.string.isRequired,
    chatUrl: PropTypes.string,
    showLivestreamer: PropTypes.bool,
    onFocusChange: PropTypes.func.isRequired
};

const mapStateToProps = (state) => Object.assign({
    showLivestreamer: state.ui.showLivestreamer,
    focused: state.ui.focusedContextItem
}, state.ui.contextChannel);

const doChannelAction = (action, channel, dispatch) => {
    dispatch(getChannelAction(action, channel));
    if(shouldClose(action, channel)) {
        window.close();
    }
    else {
        dispatch({
            type: storeTypes.CLOSE_CONTEXT
        });
    }
};

const mapDispatchToProps = (dispatch) => ({
    onOpen(channel) {
        doChannelAction(CHANNEL_ACTIONS.OPEN, channel, dispatch);
    },
    onArchive(channel) {
        doChannelAction(CHANNEL_ACTIONS.ARCHIVE, channel, dispatch);
    },
    onChat(channel) {
        doChannelAction(CHANNEL_ACTIONS.CHAT, channel, dispatch);
    },
    onRefresh(id) {
        dispatch({
            command: "refresh",
            payload: id
        });
        dispatch({
            type: storeTypes.CLOSE_CONTEXT
        });
    },
    onCopy(channel) {
        doChannelAction(CHANNEL_ACTIONS.COPY, channel, dispatch);
    },
    onAdd(id) {
        const [
            login,
            type
        ] = id.split("|");
        dispatch({
            command: "add",
            payload: {
                login,
                type
            }
        });
        dispatch({
            type: storeTypes.CLOSE_CONTEXT
        });
    },
    onRemove(id) {
        dispatch({
            command: "remove",
            payload: id
        });
        dispatch({
            type: storeTypes.CLOSE_CONTEXT
        });
    },
    onClose() {
        dispatch({
            type: storeTypes.CLOSE_CONTEXT
        });
    },
    onLivestreamer(channel) {
        doChannelAction(CHANNEL_ACTIONS.LIVESTREAMER, channel, dispatch);
    },
    onFocusChange(index) {
        dispatch({
            type: storeTypes.SET_CONTEXT_FOCUS,
            payload: index
        });
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(ChannelContextPanel);
