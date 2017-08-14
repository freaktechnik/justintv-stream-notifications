import React from 'react';
import openIconic from 'open-iconic/sprite/open-iconic.min.svg';
import LiveState from '../live-state.json';

//TODO don't build stuff when it's not displayed.

const EXTRA_ICONS = {
        "viewers": "eye",
        "category": "tag",
        "provider": "hard-drive"
    },
    CHANNEL_ID_PREFIX = "channel",
    EXPLORE_ID_PREFIX = "explorechan",
    CONTEXTMENU_ID = "context",
    EXPLORE_CONTEXTMENU_ID = "explore-context";

const Icon = (props) => {
    return ( <svg className="icon" viewBox="0 0 8 8">
        <use xlinkHref={ `${openIconic}#${props.type}` }></use>
    </svg> );
};
Icon.propTypes = {
    type: React.PropTypes.string.isRequired
};

const Extra = (props) => {
    return ( <span className={ `${props.type}Wrapper hide-offline` }>
        <Icon type={ EXTRA_ICONS[props.type] }/>&nbsp;<span className={ props.type }>{ props.value }</span>
    </span> );
};
Extra.propTypes = {
    type: React.PropTypes.string.isRequired,
    value: React.PropTypes.string.isRequired
};

const Extras = (props) => {
    const extras = [];
    if("viewers" in props && props.viewers > 0) {
        extras.push(<Extra type="viewers" value={ props.viewers.toString() }/>);
    }
    if(props.category) {
        extras.push(<Extra type="category" value={ props.category }/>);
    }
    extras.push(<Extra type="provider" value={ props.provider }/>);
    return ( <aside>{ extras }</aside> );
};
Extras.propTypes = {
    viewers: React.PropTypes.number,
    category: React.PropTypes.string,
    provider: React.PropTypes.string.isRequired
};

const InnerChannel = (props) => {
    return ( <div>
        <img srcset={ Object.keys(props.image).map((s) => `${props.image[s]} ${s}w`).join(",") } sizes="30px"/>
        <span className="redirecting hide-offline" hidden={ props.liveState !== LiveState.REBROADCAST }>
            <ul className="redirectors">
            </ul>
        </span>
        <span class="rebroadcast hide-offline" hidden>
            <Icon type="loop"/>
        </span>
        <span class="name">{ props.uname }</span><br/>
        <span class="title hide-offline">{ props.title }</span>
        <Extras viewers={ props.viewers } category={ props.category } provider={ props.provider }/>
    </div> );
};
InnerChannel.propTypes = {
    image: React.PropTypes.objectOf(React.PropTypes.string).isRequired,
    liveState: React.PropTypes.oneOf(Object.keys(LiveState)),
    uname: React.PropTypes.string.isRequired,
    title: React.PropTypes.string.isRequired,
    viewers: React.PropTypes.number,
    category: React.PropTypes.string,
    provider: React.PropTypes.string.isRequired
};

const Channel = (props) => {
    return ( <li title={ props.uname } id={ CHANNEL_ID_PREFIX + props.id } className={ props.type }>
        <a href="" contextmenu={ CONTEXTMENU_ID }>
            <img src={ props.thumbnail }/>
            <InnerChannel image={ props.image } uname={ props.uname } title={ props.title } viewers={ props.viewers } category={ props.category } provider={ props.provider } liveState={ props.liveState }/>
        </a>
    </li> );
};
Channel.propTypes = {
    image: React.PropTypes.objectOf(React.PropTypes.string).isRequired,
    liveState: React.PropTypes.oneOf(Object.keys(LiveState)),
    uname: React.PropTypes.string.isRequired,
    title: React.PropTypes.string.isRequired,
    viewers: React.PropTypes.number,
    category: React.PropTypes.string,
    provider: React.PropTypes.string.isRequired,
    id: React.PropTypes.number.isRequired,
    type: React.PropTypes.string.isRequired,
    thumbnail: React.PropTypes.string.isRequired
};

const ExternalChannel = (props) => {
    return ( <li title={ props.uname } id={ EXPLORE_ID_PREFIX + props.login } className={ props.type }>
        <a href="" contextmenu={ EXPLORE_CONTEXTMENU_ID }>
            <img src={ props.thumbnail }/>
            <InnerChannel image={ props.image } uname={ props.uname } title={ props.title } viewers={ props.viewers } category={ props.category } provider={ props.provider } liveState={ props.liveState }/>
        </a>
    </li> );
};
ExternalChannel.propTypes = {
    image: React.PropTypes.objectOf(React.PropTypes.string).isRequired,
    liveState: React.PropTypes.oneOf(Object.keys(LiveState)),
    uname: React.PropTypes.string.isRequired,
    title: React.PropTypes.string.isRequired,
    viewers: React.PropTypes.number,
    category: React.PropTypes.string,
    provider: React.PropTypes.string.isRequired,
    login: React.PropTypes.string.isRequired,
    type: React.PropTypes.string.isRequired,
    thumbnail: React.PropTypes.string.isRequired
};
