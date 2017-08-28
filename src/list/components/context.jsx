import { CompactChannel } from './channels.jsx';
import PropTypes from 'prop-types';
import React from 'react';
import LiveState from '../../live-state.json';
import { connect } from 'react-redux';

const _ = browser.i18n.getMessage;

const ContextItem = (props) => {
    return ( <li><button onClick={ props.onClick }>{ _(props.label) }</button></li> );
};
ContextItem.propTypes = {
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func
};

const ContextList = (props) => {
    return (
        <dialog className="context-panel">
            <h1>{ props.title }</h1>
            <ul>
                { props.children }
            </ul>
        </dialog>
    );
};

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
    if(props.hasChat && props.liveState !== LiveState.OFFLINE) {
        items.push(<ContextItem label="context_chat" key="chat" onClick={ () => props.onChat(props) }/>);
    }
    if(props.providerEnabled) {
        if(props.external) {
            items.push(<ContextItem label="context_add" key="add" onCLick={ () => props.onAdd(props.id) }/>);
        }
        else {
            items.push(<ContextItem label="context_remove" key="remove" onClick={ () => props.onRemove(props.id) }/>);
            items.push(<ContextItem label="context_refresh" onClick={ () => props.onRefresh(props.id) }/>);
            if(pros.liveState === LiveState.LIVE) {
                items.push(<ContextItem label="context_open" onClick={ () => props.onArchive(props.id) }/>);
            }
        }
    }
    return ( <ContextList title={ props.uname }>
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
    redirectors: PropTypes.shape(CompactChannel.propType),
    hasChat: PropTypes.bool.isRequired,
    id: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
    ]).isRequired,
    providerEnabled: PropTypes.bool
    onOpen: PropTypes.func,
    onChat: PropTypes.func,
    onAdd: PropTypes.func,
    onCopy: PropTypes.func,
    onRemove: PropTypes.func
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
        },
        onCopy(payload) {
            dispatch({
                type: "copy",
                payload
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
        },
        onRemove(id) {
            dispatch({
                command: "remove",
                payload: id
            });
        }
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(ContextPanel);
