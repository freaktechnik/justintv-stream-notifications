import PropTypes from 'prop-types';
import React from 'react';
import NavigateableList from '../navigateable-list.jsx';

const _ = browser.i18n.getMessage;

class ContextList extends React.Component {
    static get propTypes() {
        return {
            title: PropTypes.string.isRequired,
            onClose: PropTypes.func.isRequired,
            children: PropTypes.node.isRequired,
            focused: PropTypes.number,
            onFocusChange: PropTypes.func.isRequired
        };
    }

    static get defaultProps() {
        return {
            focused: 0
        };
    }

    componentDidMount() {
        if(this.dialog) {
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
            } }>
                <header>
                    <button title={ _("context_back") } onClick={ this.props.onClose }>{ "<" }</button>
                    <h1>{ this.props.title }</h1>
                </header>
                <NavigateableList focused={ this.props.focused } onFocusChange={ this.props.onFocusChange }>
                    { this.props.children }
                </NavigateableList>
            </dialog>
        );
    }
}

export default ContextList;
