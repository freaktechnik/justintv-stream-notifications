import { CompactChannel } from './channels.jsx';
import PropTypes from 'prop-types';
import React from 'react';
import LiveState from '../../live-state.json';
import { connect } from 'react-redux';

const _ = browser.i18n.getMessage;

const ContextItem = (props) => {
    return ( <li><button onClick={ props.onClick }>{ _(props.label, props.params) }</button></li> );
};
ContextItem.defaultProps = {
    params: []
};
ContextItem.propTypes = {
    label: PropTypes.string.isRequired,
    params: PropTypes.arrayOf(PropTypes.string),
    onClick: PropTypes.func
};

const ContextList = (props) => {
    return (
        <dialog className="context-panel" open>
            <header>
                <button title={ _("context_back") } onClick={ props.onClose }>{ "<" }</button>
                <h1>{ props.title }</h1>
            </header>
            <ul>
                { props.children }
            </ul>
        </dialog>
    );
};
ContextList.propTypes = {
    title: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired
}

const redirectorsShape = PropTypes.arrayOf(PropTypes.shape({
    uname: PropTypes.string.isRequired,
    id: PropTypes.number.isRequired
}));

/**
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
const ContextPanel = (props) => {
    //TODO redirectors
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
            items.push(<ContextItem label="context_add" key="add" onCLick={ () => props.onAdd(props.id) }/>);
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
        <ContextItem label="openChannel"/>
        { items }
        <ContextItem label="context_copy" onClick={ () => props.onCopy({
            url: props.url,
            uname: props.uname
        }) }/>
    </ContextList> );
};
ContextPanel.defaultProps = {
    providerEnabled: true
};
ContextPanel.propTypes = {
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
    onClose: PropTypes.func.isRequired
};

const mapStateToProps = (state) => {
    return state.ui.contextChannel;
};

const mapDispatchToProps = (dispatch) => {
    return {
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
            dispatch({
                type: "setContextChannel",
                payload: null
            });
        },
        onCopy(payload) {
            dispatch({
                type: "copy",
                payload
            });
            dispatch({
                type: "setContextChannel",
                payload: null
            });
        },
        onAdd(id) {
            const [ login, type ] = id.split("|");
            dispatch({
                command: "add",
                payload: {
                    login,
                    type
                }
            });
            dispatch({
                type: "setContextChannel",
                payload: null
            });
        },
        onRemove(id) {
            dispatch({
                command: "remove",
                payload: id
            });
            dispatch({
                type: "setContextChannel",
                payload: null
            });
        },
        onClose() {
            dispatch({
                type: "setContextChannel",
                payload: null
            });
        }
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(ContextPanel);
