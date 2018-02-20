import React from 'react';
import PropTypes from 'prop-types';
import {
    UP_KEYS, DOWN_KEYS
} from '../constants/navigateable';

const NEXT = 1,
    PREV = -1;

class NavigateableItem extends React.Component {
    static get defaultProps() {
        return {
            hasFocus: true
        };
    }

    static get propTypes() {
        return {
            children: PropTypes.node.isRequired,
            onFocusChange: PropTypes.func.isRequired,
            focused: PropTypes.bool.isRequired,
            onFocus: PropTypes.func,
            hasFocus: PropTypes.bool
        };
    }

    static preventScrolling(event) {
        if(DOWN_KEYS.includes(event.key) || UP_KEYS.includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    get focusedItem() {
        return this.item;
    }

    focus() {
        this.focusedItem.focus();
    }

    handleKey(event) {
        if(DOWN_KEYS.includes(event.key)) {
            this.props.onFocusChange(NEXT);
            NavigateableItem.preventScrolling(event);
        }
        else if(UP_KEYS.includes(event.key)) {
            this.props.onFocusChange(PREV);
            NavigateableItem.preventScrolling(event);
        }
    }

    componentDidUpdate() {
        if(this.props.focused && this.props.hasFocus) {
            this.focus();
        }
    }

    render() {
        return (
            <li ref={ (e) => {
                this.item = e;
            } } tabIndex={ 0 } onKeyUp={ (e) => this.handleKey(e) } onKeyDown={ (e) => NavigateableItem.preventScrolling(e) } role="row" onFocus={ this.props.onFocus }>
                { this.props.children }
            </li>
        );
    }
}

export default NavigateableItem;
