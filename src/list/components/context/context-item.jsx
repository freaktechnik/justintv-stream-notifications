import React from 'react';
import PropTypes from 'prop-types';
import NavigateableItem from '../../../content/components/navigateable-item.jsx';

const _ = browser.i18n.getMessage;

class ContextItem extends NavigateableItem {
    static get defaultProps() {
        return {
            params: []
        };
    }

    static get propTypes() {
        return {
            label: PropTypes.string.isRequired,
            params: PropTypes.arrayOf(PropTypes.string),
            onClick: PropTypes.func,
            onFocusChange: PropTypes.func.isRequired,
            focused: PropTypes.bool.isRequired,
            onFocus: PropTypes.func
        };
    }

    get focusedItem() {
        return this.button;
    }

    render() {
        const children = [ <button onClick={ this.props.onClick } key="a" onFocus={ this.props.onFocus } ref={ (e) => {
            this.button = e;
        } }>
            { _(this.props.label, this.props.params) }
        </button> ];
        return React.cloneElement(super.render(), {
            tabIndex: -1
        }, ...children);
    }
}

export default ContextItem;
