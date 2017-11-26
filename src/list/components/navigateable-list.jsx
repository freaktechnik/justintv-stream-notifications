import React from 'react';
import PropTypes from 'prop-types';

const FIRST = 0,
    LAST = -1;

class NavigateableList extends React.Component {
    static get propTypes() {
        return {
            children: PropTypes.node,
            className: PropTypes.string,
            role: PropTypes.string,
            onFocusChange: PropTypes.func.isRequired,
            focused: PropTypes.number
        };
    }

    static get defaultProps() {
        return {
            className: undefined,
            role: 'listbox'
        };
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
        if(event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "Home" || event.key === "PageDown") {
            this.focusChild(FIRST);
            event.preventDefault();
            event.stopPropagation();
        }
        else if(event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "End" || event.key === "PageUp") {
            this.focusChild(this.childCount + LAST);
            event.preventDefault();
            event.stopPropagation();
        }
    }

    mapChildren(children) {
        return React.Children.map(children, (child, index) => React.cloneElement(child, {
            focused: index === this.props.focused,
            onFocusChange: (i) => this.selectItem(i),
            onFocus: () => this.focusChild(index)
        }));
    }

    render() {
        this.childCount = React.Children.count(this.props.children);
        const mappedChildren = this.mapChildren(this.props.children);
        return (
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions
            <ul onKeyUp={ (e) => this.handleKey(e) } tabIndex={ 0 } ref={ (e) => {
                this.list = e;
            } } role={ this.props.role } className={ this.props.className }>
                { mappedChildren }
            </ul>
        );
    }
}

export default NavigateableList;
