import React from 'react';
import PropTypes from 'prop-types';

const HOUR = 60;
const MS_TO_MIN = 60000;
const TWO_DIGITS = 10;

const getDifference = (timestamp) => {
    const diff = Math.floor((Date.now() - timestamp) / MS_TO_MIN);

    const hours = Math.floor(diff / HOUR);
    const minutes = diff - (hours * HOUR);
    let minuteDigit = '';
    if(minutes < TWO_DIGITS) {
        minuteDigit = '0';
    }
    return `${hours}:${minuteDigit}${minutes}`;
};

export default class Since extends React.Component {
    static get propTypes() {
        return {
            children: PropTypes.number.isRequired
        };
    }

    tick() {
        if(!this.mounted) {
            return;
        }
        this.intervalId = setTimeout(() => this.tick(), MS_TO_MIN);
        this.forceUpdate();
    }

    componentDidMount() {
        this.mounted = true;
        this.tick();
    }

    componentWillUnmount() {
        this.mounted = false;
        if(this.intervalId) {
            clearTimeout(this.timeoutId);
        }
    }

    render() {
        return <React.Fragment>
            { getDifference(this.props.children) }
        </React.Fragment>;
    }
}
