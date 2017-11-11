import React from 'react';
import PropTypes from 'prop-types';
import NavigateableItem from '../navigateable-item.jsx';

const _ = browser.i18n.getMessage;

class Tab extends NavigateableItem {
    static get defaultProps() {
        return {
            active: false
        };
    }

    static get propTypes() {
        return {
            title: PropTypes.string.isRequired,
            onClick: PropTypes.func,
            focused: PropTypes.bool.isRequired,
            onFocusChange: PropTypes.func.isRequired
        };
    }

    get focusedItem() {
        return this.button;
    }

    render() {
        let className;
        if(this.props.focused) {
            className = "current";
        }
        const child = ( <button role="tab" onClick={ this.props.onClick } onFocus={ this.props.onClick } className={ className } ref={ (e) => {
            this.button = e;
        } } tabIndex={ -1 }>{ _(this.props.title) }</button> );
        const element = super.render();
        return React.cloneElement(element, {
            role: "presentation",
            tabIndex: -1
        }, child);
    }
}

export default Tab;
