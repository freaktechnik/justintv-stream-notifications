import React from 'react';
import PropTypes from 'prop-types';
import Extras from './extras.jsx';
import Redirecting, { redirectorsShape } from './redirecting.jsx';
import Avatar from './avatar.jsx';
import Icon from '../icon.jsx';
import LiveState from '../../../live-state.json';
import { LARGE_IMAGE } from '../../utils';

const InnerChannel = (props) => {
    let extras,
        redirecting,
        title,
        className = '';
    if(props.extras) {
        extras = <Extras { ...props.extras }/>;
    }
    if(props.redirectors) {
        redirecting = <Redirecting channels={ props.redirectors } onRedirectorClick={ props.onRedirectorClick }/>;
    }
    if(props.title && props.liveState !== LiveState.OFFLINE) {
        title = ( <span className="title" lang={ props.language }><br/>{ props.title }</span> );
    }
    if(props.imageSize !== LARGE_IMAGE) {
        className = 'compact';
    }
    return ( <div className={ className }>
        <Avatar image={ props.image } size={ props.imageSize }/>
        <div className="align-right">
            { redirecting }
            <span className="rebroadcast" hidden={ props.liveState !== LiveState.REBROADCAST }>
                <Icon type="loop"/>
            </span>
            <span className="name">{ props.uname }</span>
            { title }
            { extras }
        </div>
    </div> );
};
InnerChannel.propTypes = {
    image: PropTypes.objectOf(PropTypes.string).isRequired,
    liveState: PropTypes.oneOf(Object.values(LiveState)).isRequired,
    uname: PropTypes.string.isRequired,
    title: PropTypes.string,
    extras: PropTypes.shape(Extras.propTypes),
    redirectors: redirectorsShape,
    imageSize: PropTypes.number,
    language: PropTypes.string,
    onRedirectorClick: PropTypes.func.isRequired
};

export default InnerChannel;
