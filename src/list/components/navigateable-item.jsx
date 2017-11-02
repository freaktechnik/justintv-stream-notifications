import React from 'react';
import PropTypes from 'prop-types';

const NEXT = 1,
    PREV = -1;

class NavigateableItem extends React.Component {
    static get propTypes() {
        return {
            children: PropTypes.node.isRequired,
            onFocusChange: PropTypes.func.isRequired
        };
    }

    get focusedItem() {
        return this.item;
    }

    focus() {
        this.focusedItem.focus();
    }

    isEqualNode(node) {
        return node.isEqualNode(this.focusedItem);
    }

    handleKey(event) {
        if(event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown") {
            this.props.onFocusChange(NEXT);
            event.preventDefault();
            event.stopPropagation();
        }
        else if(event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "PageUp") {
            this.props.onFocusChange(PREV);
            event.preventDefault();
            event.stopPropagation();
        }
    }

    render() {
        return (
            <li ref={ (e) => {
                this.item = e;
            } } tabIndex={ 0 } onKeyUp={ (e) => this.handleKey(e) } role="row">
                { this.props.children }
            </li>
        );
    }
}

export default NavigateableItem;
