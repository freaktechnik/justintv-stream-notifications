import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { ContextList, ContextItem, closeAction } from './context-list.jsx';

const _ = browser.i18n.getMessage;

/*
 * < | Queue
 * --------------------------
 * Update All Channels
 * Pause/Resume Refresh Queue
 */
const QueueContextPanel = (props) => {
    let queueItem;
    if(props.queueEnabled) {
        if(props.paused) {
            queueItem = <ContextItem label="context_resume" onClick={ props.onResume }/>
        }
        else {
            queueItem = <ContextItem label="context_pause" onClick={ props.onPause }/>
        }
    }
    return ( <ContextList title={ _('context_queue_title') } onClose={ props.onClose }>
        <ContextItem label="context_refresh_all" onClick={ props.onRefresh }/>
        { queueItem }
    </ContextList> )
};
QueueContextPanel.defaultProps = {
    queueEnabled: false,
    paused: true
};
QueueContextPanel.propTypes = {
    queueEnabled: PropTypes.bool,
    paused: PropTypes.bool,
    onResume: PropTypes.func,
    onPause: PropTypes.func,
    onRefresh: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
};

const mapStateToProps = (state) => {
    return {
        queueEnabled: state.settings.queue.status,
        paused: state.settings.queue.paused
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        onResume() {
            dispatch(Object.assign({
                command: "resume"
            }, closeAction));
        },
        onPause() {
            dispatch(Object.assign({
                command: "pause"
            }, closeAction));
        },
        onRefresh() {
            dispatch({
                command: "refresh",
                type: "loading"
            });
            dispatch(closeAction);
        },
        onClose() {
            dispatch(closeAction);
        }
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(QueueContextPanel);
