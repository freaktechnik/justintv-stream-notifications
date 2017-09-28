import PropTypes from 'prop-types';
import React from 'react';
import LiveState from '../../live-state.json';
import { connect } from 'react-redux';
import { ContextList, ContextItem, closeAction } from './context-list.jsx';

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
            items.push(<ContextItem label="context_redirector" params={ [ r.uname ]} onClick={ () => props.onOpen({
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
                items.push(<ContextItem label="context_open" onClick={ () => props.onArchive(props.id) }/>);
            }
            items.push(<ContextItem label="context_remove" key="remove" onClick={ () => props.onRemove(props.id) }/>);
            items.push(<ContextItem label="context_refresh" onClick={ () => props.onRefresh(props.id) }/>);
        }
    }
    return ( <ContextList title={ props.uname } onClose={ props.onClose }>
        <ContextItem label="openChannel" onClick={ () => props.onOpen(props) }/>
        { items }
        <ContextItem label="context_copy" onClick={ () => props.onCopy({
            url: props.url,
            uname: props.uname
        }) }/>
    </ContextList> );
};
ChannelContextPanel.defaultProps = {
    providerEnabled: true
};
ChannelContextPanel.propTypes = {
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
    onOpen: PropTypes.func,
    onChat: PropTypes.func,
    onAdd: PropTypes.func,
    onCopy: PropTypes.func,
    onRemove: PropTypes.func,
    onClose: PropTypes.func.isRequired,
    onArchive: PropTypes.func,
    onRefresh: PropTypes.func,
    url: PropTypes.string.isRequired,
    chatUrl: PropTypes.string
};

const mapStateToProps = (state) => state.ui.contextChannel;

const mapDispatchToProps = (dispatch) => ({
    onOpen(channel) {
        if(channel.external) {
            dispatch({
                command: "openUrl",
                payload: channel.url
            });
        }
        else {
            dispatch({
                command: "open",
                payload: channel.id
            });
        }
        window.close();
    },
    onArchive(id) {
        dispatch({
            command: "openArchive",
            payload: id
        });
        window.close();
    },
    onChat(channel) {
        if(channel.external) {
            dispatch({
                command: "openUrl",
                payload: channel.chatUrl
            });
        }
        else {
            dispatch({
                command: "openChat",
                payload: channel.id
            });
        }
        window.close();
    },
    onRefresh(id) {
        dispatch({
            command: "refresh",
            payload: id
        });
        dispatch(closeAction);
    },
    onCopy(payload) {
        dispatch({
            type: "copy",
            payload
        });
        dispatch(closeAction);
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
        dispatch(closeAction);
    },
    onRemove(id) {
        dispatch({
            command: "remove",
            payload: id
        });
        dispatch(closeAction);
    },
    onClose() {
        dispatch(closeAction);
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(ChannelContextPanel);
