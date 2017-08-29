import PropTypes from 'prop-types';
import React from 'react';

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

const closeAction = {
    type: "closeContext"
};

export { ContextItem, ContextList, closeAction };
