import React from 'react';
import PropTypes from 'prop-types';
import LiveState from '../../live-state.json';
import { connect } from 'react-redux';
import Icon from './icon.jsx';

const _ = browser.i18n.getMessage;

const Extra = (props) => {
    return ( <span className={ `${props.type}Wrapper hide-offline` }>
        <Icon type={ Extra.ICONS[props.type] }/>&nbsp;<span className={ props.type }>{ props.value }</span>
    </span> );
};
Extra.ICONS = Object.freeze({
    "viewers": "eye",
    "category": "tag",
    "provider": "hard-drive"
});
Extra.propTypes = {
    type: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired
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
    viewers: PropTypes.number,
    category: PropTypes.string,
    provider: PropTypes.string.isRequired
};

const Avatar = (props) => {
    const srcet = Object.keys(props.image).map((s) => `${props.image[s]} ${s}w`).join(",");
    return ( <img srcset={ srcset } sizes={ props.size + "px" } /> );
};
Avatar.propTypes = {
    image: PropTypes.objectOf(PropTypes.string).isRequired,
    size: PropTypes.number.isRequired
};

export const CompactChannel = (props) => {
    return ( <li title={ props.uname }>
        <Avatar image={ props.image } size="14"/>
    </li> );
};
CompactChannel.propTypes = {
    uname: PropTypes.string.isRequired,
    image: PropTypes.objectOf(PropTypes.string).isRequired
};

const Redirecting = (props) => {
    const channels = props.channels.map((ch) => {
        return ( <CompactChannel { ...ch } ref={ props.uname }/> );
    });
    return ( <span className="redirecting">
        <ul class="reidrectors">
            { channels }
        </ul>
        →
    </span> );
};
Redirecting.propTypes = {
    channels: PropTypes.arrayOf(PropTypes.shape(CompactChannel.propTypes)).isRequired
};

const InnerChannel = (props) => {
    let extras,
        redirecting,
        title;
    if(props.extras) {
        extras = <Extras { ...props.extras }/>;
    }
    if(props.redirectors) {
        redirecting = <Redirecting channels={ props.redirectors }/>;
    }
    if(props.title && props.liveState !== LiveState.OFFLINE) {
        title = ( <span class="title"><br/>{ props.title }</span> );
    }
    return ( <div>
        <Avatar image={ props.image } size="30"/>
        { redirecting }
        <span class="rebroadcast hide-offline" hidden={ props.liveState !== LiveState.REBROADCAST }>
            <Icon type="loop"/>
        </span>
        <span class="name">{ props.uname }</span>
        { title }
        { extras }
    </div> );
};
InnerChannel.propTypes = {
    image: PropTypes.objectOf(PropTypes.string).isRequired,
    liveState: PropTypes.oneOf(Object.keys(LiveState)).isRequired,
    uname: PropTypes.string.isRequired,
    title: PropTypes.string,
    extras: PropTypes.shape(Extras.propTypes),
    redirectors: PropTypes.arrayOf(PropTypes.shape(CompactChannel.propTypes))
};

const Channel = (props) => {
    const thumbnail = [];
    if(props.thumbnail) {
        thumbnail.push(<img src={ props.thumbnail }/>);
    }
    return ( <li title={ props.uname } className={ props.type }>
        { thumbnail }
        <InnerChannel image={ props.image } uname={ props.uname } title={ props.title } extras={ props.extras } liveState={ props.liveState }/>
    </li> );
};
Channel.propTypes = {
    image: PropTypes.objectOf(React.PropTypes.string).isRequired,
    liveState: PropTypes.oneOf(Object.keys(LiveState)).isRequired,
    uname: PropTypes.string.isRequired,
    title: PropTypes.string,
    type: PropTypes.string.isRequired,
    thumbnail: PropTypes.string,
    extras: PropTypes.shape(Extras.propTypes),
    redirectors: PropTypes.arrayOf(PropTypes.shape(CompactChannel.propTypes))
};

const ChannelList = (props) => {
    const channels = props.channels.map((ch) => ( <Channel { ...ch } ref={ ch.id }/> ));
    return ( <ul>
        { channels }
    </ul> );
};
ChannelList.propTypes = {
    channels: PropTypes.arrayOf(PropTypes.array).isRequired,
};

const Channels = (props) => {
    if(!props.channels.length || props.loading) {
        if(props.type === 0) {
            return ( <div>{ _('panel_nothing_live') }</div> );
        }
        else if(props.type === 2) {
            return ( <div>{ _('panel_nothing') }</div> );
        }
        else if(props.type === 3) {
            if(!props.loading) {
                return ( <div>{ _('panel_no_results') }</div> );
            }
            else {
                return ( <div>{ _('panel_loading') }</div> );
            }
        }
    }
    else {
        //TODO explore panel also has provider dropdown
        return ( <ChannelList { ...props }/>)
    }
};
Channels.defaultProps = {
    loading: false
};
Channels.propTypes = {
    channels: PropTypes.arrayOf(PropTypes.array).isRequired,
    type: PropTypes.oneOf([ 0, 1, 2, 3 ]).isRequired,
    loading: PropTypes.bool
};

const filterChannels = (channels, query) => {
    const queries = query.split(" ");
    return channels.filter((ch) => {
        return queries.every((q) => {
            return ch.provider === q || ch.uname === q || ch.title === q || (ch.extras && (ch.extras.viewers === q || ch.extras.category === 1));
        });
    });
};

const getChannelList = (channels, type, nonLiveDisplay, formatChannel) => {
    const internalRedirects = [], externalRedirects = [], shownChannels = [];
    for(const channel of channels) {
        if(channel.live.state === LiveState.LIVE && type !== 2) {
            shownChannels.push(formatChannel(channel));
        }
        else if(channel.live.state === LiveState.REDIRECT) {
            if("id" in channel.live.alternateChannel) {
                internalRedirects.push(channel);
            }
            else {
                externalRedirects.push(channel);
            }
        }
        else if(channel.live.state === LiveState.REBROADCAST && type === nonLiveDisplay) {
            shownChannels.push(formatChannel(channel));
        }
        else if(channel.live.state === LiveState.OFFLINE && type === 2) {
            shownChannels.push(formatChannel(channel));
        }
    }

    if(type === 2 && nonLiveDisplay === 2) {
        //TODO format the redirects.
        return shownChannels.concat(internalRedirects, externalRedirects);
    }
    else if(type === nonLiveDisplay) {
        for(const redirecting of internalRedirects) {
            const target = shownChannels.find((ch) => ch.id === redirecting.live.alternateChannel.id);
            if(!target.redirectors) {
                target.redirectors = [ formatChannel(redirecting) ];
            }
            else {
                target.redirectors.push(formatChannel(redirecting));
            }
        }

        const externals = [];
        for(const redirecting of externalRedirects) {
            const target = externals.find((ch) => ch.login === redirecting.live.alternateChannel.login && ch.type === redirecting.live.alternateChannel.type);
            if(!target) {
                const external = redirecting.live.alternateChannel;
                external.redirectors = [ formatChannel(redirecting) ];
                externals.push(external);
            }
            else {
                target.rediectros.push(formatChannel(redirecting));
            }
        }
        return shownChannels.concat(externals);
    }
    return shownChannels;
};

const formatChannel = (channel, providers, type, extras = true, style = 1) => {
    const formattedChannel = {
        uname: channel.uname,
        type: channel.type,
        image: channel.image,
        liveState: channel.live.state,
    };
    if(extras) {
        formattedChannel.extras = {
            category: channel.category,
            viewers: channel.viewers,
            provider: providers[channel.type].name
        };
    }
    if(channel.live.state !== LiveState.OFFLINE && type !== 2) {
        if(style === 2) {
            formattedChannel.thumbnail = channel.thumbnail;
        }
        if(style !== 0) {
            formattedChannel.title = channel.title;
        }
    }
    else if(formattedChannel.extras) {
        delete formattedChannel.viewers;
        delete formattedChannel.category;
    }

    if("id" in channel) {
        formattedChannel.id = channel.id;
        formattedChannel.external = false;
    }
    else {
        formattedChannel.external = true;
        formattedChannel.id = channel.login + "|" + channel.type;
    }
};

const sortChannels = (channels, type) => {
    if(type !== 0) {
        return channels.sort((a, b) => a.uname.localeCompare(b.uname.localeCompare));
    }
    else {
        return channels.sort((a, b) => {
            if(a.live.state > LiveState.LIVE && b.live.state <= LiveState.LIVE) {
                return 1;
            }
            else if(b.live.state > LiveState.LIVE && a.live.state <= LiveState.LIVE) {
                return -1;
            }
            else {
                return a.uname.localeCompare(b.uname.localeCompare);
            }
        });
    }
};

const getVisibleChannels = (state) => {
    const saltedFormatChannel = (channel) => formatChannel(channel, state.providers, state.ui.tab, state.settings.extras, state.settings.style);
    if(state.ui.tab !== 3) {
        return sortChannels(filterChannels(getChannelList(state.channels, state.ui.tab, state.settings.nonLiveDisplay, saltedFormatChannel), state.ui.query));
    }
    else {
        return sortChannels(state.featured.map(saltedFormatChannel));
    }
};

const mapStateToProps = (state) => {
    //TODO explore panel
    return {
        channels: getVisibleChannels(state),
        extras: state.settings.extras,
        style: state.settings.style,
        type: state.ui.tab,
        nonLiveDisplay: state.settings.nonLiveDisplay,
        providers: state.providers,
        loading: false
    };
};
const mapDispatchToProps = (dispatch) => {
    return {

    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Channels);
