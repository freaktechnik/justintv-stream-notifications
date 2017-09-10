import PropTypes from 'prop-types';
import React from 'react';

const _ = browser.i18n.getMessage;

class ContextItem extends React.Component {
    static get defaultProps() {
        return {
            params: []
        };
    }

    static get propTypes() {
        return {
            label: PropTypes.string.isRequired,
            params: PropTypes.arrayOf(PropTypes.string),
            onClick: PropTypes.func
        };
    }

    render() {
        //TODO access keys?
        return ( <li>
            <button onClick={ this.props.onClick }>
                { _(this.props.label, this.props.params) }
            </button>
        </li> );
    }
}

class ContextList extends React.Component {
    static get propTypes() {
        return {
            title: PropTypes.string.isRequired,
            onClose: PropTypes.func.isRequired,
            children: PropTypes.node.isRequired,
        };
    }

    componentDidMount() {
        if(this.dialog) {
            this.dialog.focus();
            document.documentElement.style.height = `${this.dialog.scrollHeight}px`;
            document.documentElement.style.overflow = "hidden";
        }
    }

    componentWillUnmount() {
        document.documentElement.style.height = "auto";
        document.documentElement.style.overflow = "unset";
    }

    render() {
        //TODO make esc close the panel
        return (
            <dialog className="context-panel" open ref={ (e) => {
                this.dialog = e;
            } } tabIndex={ 0 }>
                <header>
                    <button title={ _("context_back") } onClick={ this.props.onClose }>{ "<" }</button>
                    <h1>{ this.props.title }</h1>
                </header>
                <ul>
                    { this.props.children }
                </ul>
            </dialog>
        );
    }
}

const closeAction = {
    type: "closeContext"
};

export { ContextItem, ContextList, closeAction };
