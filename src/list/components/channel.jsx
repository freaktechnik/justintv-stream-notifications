import React from 'react';
import PropTypes from 'prop-types';
import NavigateableItem from './navigateable-item.jsx';
import InnerChannel from './inner-channel.jsx';
import LiveState from '../../live-state.json';
import Extras from './extras.jsx';
import { redirectorsShape } from './redirecting.jsx';

export default class Channel extends NavigateableItem {
    static get propTypes() {
        return {
            image: PropTypes.objectOf(PropTypes.string).isRequired,
            liveState: PropTypes.oneOf(Object.values(LiveState)).isRequired,
            uname: PropTypes.string.isRequired,
            title: PropTypes.string,
            type: PropTypes.string.isRequired,
            thumbnail: PropTypes.string,
            extras: PropTypes.shape(Extras.propTypes),
            redirectors: redirectorsShape,
            imageSize: PropTypes.number,
            external: PropTypes.bool,
            url: PropTypes.string.isRequired,
            onClick: PropTypes.func.isRequired,
            onRedirectorClick: PropTypes.func.isRequired,
            onContextMenu: PropTypes.func.isRequired,
            onCopy: PropTypes.func.isRequired,
            onFocusChange: PropTypes.func.isRequired,
            tooltip: PropTypes.string.isRequired
        };
    }

    render() {
        this.props.children = [];
        let className = this.props.type;
        if(this.props.thumbnail) {
            this.props.children.push(<img src={ this.props.thumbnail } key="thumb" alt={ `Current thumbnail of ${this.props.uname}` }/>);
            className += ' thumbnail';
        }
        if(this.props.external) {
            className += ' external';
        }
        if(this.props.liveState > LiveState.LIVE) {
            className += ' nonlive';
        }
        this.props.children.push(<InnerChannel image={ this.props.image } uname={ this.props.uname } title={ this.props.title } extras={ this.props.extras } liveState={ this.props.liveState } redirectors={ this.props.redirectors } imageSize={ this.props.imageSize } onRedirectorClick={ this.props.onRedirectorClick } key="inner"/>);
        const element = super.render();
        return React.cloneElement(element, {
            title: this.props.tooltip,
            className,
            onClick: this.props.onClick,
            onContextMenu: this.props.onContextMenu,
            onKeyUp: (e) => {
                if(e.key === ' ' || e.key === 'Enter') {
                    this.props.onClick(e);
                }
                else {
                    this.handleKey(e);
                }
            },
            onCopy: () => this.props.onCopy({
                url: this.props.url,
                uname: this.props.uname
            })
        });
    }
}
