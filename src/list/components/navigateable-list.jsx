import React from 'react';
import PropTypes from 'prop-types';
import NavigateableItem from './navigateable-item.jsx';

const FIRST = 0;

class NavigateableList extends React.Component {
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

    mapChildren(children = this.props.children) {
        this.childrenInstances = [];
        return React.Children.map(children, (c, index) => React.cloneElement(c, {
            onFocusChange: (i) => this.selectItem(i),
            ref: (e) => {
                this.childrenInstances[index] = e;
            }
        }));
    }

    render() {
        const mappedChildren = this.mapChildren();
        return (
            <ul onKeyUp={ (e) => this.handleKey(e) } tabIndex={ 0 } ref={ (e) => {
                this.list = e;
            } } role="listbox">
                { mappedChildren }
            </ul>
        );
    }
}

export default NavigateableList;
