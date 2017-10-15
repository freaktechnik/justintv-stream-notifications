import React from 'react';
import PropTypes from 'prop-types';

const NEXT = 1,
    PREV = -1,
    FIRST = 0;

export class NavigateableItem extends React.Component {
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

export class NavigateableList extends React.Component {
    static get propTypes() {
        return {
            children: PropTypes.arrayOf(PropTypes.instanceOf(NavigateableItem))
        };
    }

    focusChild(index) {
        index = Math.max(FIRST, Math.min(--this.childrenInstances.length, index));
        this.childrenInstances[index].focus();
    }

    selectItem(relativeIndex) {
        if(!this.childrenInstances.length) {
            return;
        }
        if(relativeIndex !== FIRST) {
            let toFocus;
            for(const i in this.childrenInstances) {
                if(this.childrenInstances[i].isEqualNode(document.activeElement)) {
                    toFocus = (parseInt(i, 10) + relativeIndex) % this.childrenInstances.length;
                    if(toFocus < FIRST) {
                        toFocus += this.childrenInstances.length;
                    }
                    break;
                }
            }
            if(toFocus !== undefined) {
                this.focusChild(toFocus);
            }
        }
    }

    handleKey(event) {
        if(event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "Home" || event.key === "PageDown") {
            this.focusChild(FIRST);
            event.preventDefault();
            event.stopPropagation();
        }
        else if(event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "End" || event.key === "PageUp") {
            this.focusChild(--this.childrenInstances.length);
            event.preventDefault();
            event.stopPropagation();
        }
    }

    render() {
        this.childrenInstances = [];
        const mappedChildren = React.Children.map(this.props.children, (c, index) => React.cloneElement(c, {
            onFocusChange: (i) => this.selectItem(i),
            ref: (e) => {
                this.childrenInstances[index] = e;
            }
        }));
        return (
            <ul onKeyUp={ (e) => this.handleKey(e) } className="scrollable" tabIndex={ 0 } ref={ (e) => {
                this.list = e;
            } } role="listbox">
                { mappedChildren }
            </ul>
        );
    }
}
