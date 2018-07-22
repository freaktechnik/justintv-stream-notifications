import React from 'react';
import PropTypes from 'prop-types';
import {
    UP_KEYS, DOWN_KEYS, START_KEYS, END_KEYS
} from '../constants/navigateable.js';

const FIRST = 0,
    LAST = -1;

class NavigateableList extends React.Component {
    static get propTypes() {
        return {
            children: PropTypes.node,
            className: PropTypes.string,
            role: PropTypes.string,
            onFocusChange: PropTypes.func.isRequired,
            focused: PropTypes.number,
            hasFocus: PropTypes.bool
        };
    }

    static get defaultProps() {
        return {
            className: undefined,
            role: 'listbox',
            hasFocus: true
        };
    }

    static preventScrolling(event) {
        if(DOWN_KEYS.includes(event.key) || UP_KEYS.includes(event.key) || START_KEYS.includes(event.key) || END_KEYS.includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    focusChild(index) {
        index = Math.max(FIRST, Math.min(this.childCount + LAST, index));
        this.props.onFocusChange(index);
    }

    selectItem(relativeIndex) {
        if(!this.childCount) {
            return;
        }
        if(relativeIndex !== FIRST && typeof this.props.focused === "number") {
            let toFocus;
            toFocus = (this.props.focused + relativeIndex) % this.childCount;
            if(toFocus < FIRST) {
                toFocus += this.childCount;
            }
            if(toFocus !== undefined) {
                this.focusChild(toFocus);
            }
        }
    }

    handleKey(event) {
        if(DOWN_KEYS.includes(event.key) || START_KEYS.includes(event.key)) {
            this.focusChild(FIRST);
            NavigateableList.preventScrolling(event);
        }
        else if(UP_KEYS.includes(event.key) || END_KEYS.includes(event.key)) {
            this.focusChild(this.childCount + LAST);
            NavigateableList.preventScrolling(event);
        }
    }

    mapChildren(children) {
        return React.Children.map(children, (child, index) => React.cloneElement(child, {
            focused: index === this.props.focused,
            onFocusChange: (i) => this.selectItem(i),
            onFocus: () => this.focusChild(index),
            hasFocus: this.props.hasFocus
        }));
    }

    render() {
        this.childCount = React.Children.count(this.props.children);
        const mappedChildren = this.mapChildren(this.props.children);
        return (
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions
            <ul onKeyUp={ (e) => this.handleKey(e) } onKeyDown={ (e) => NavigateableList.preventScrolling(e) } tabIndex={ 0 } ref={ (e) => {
                this.list = e;
            } } role={ this.props.role } className={ this.props.className }>
                { mappedChildren }
            </ul>
        );
    }
}

export default NavigateableList;
