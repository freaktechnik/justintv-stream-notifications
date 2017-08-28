import React from 'react';
import PropTypes from 'prop-types';
import LiveState from '../../live-state.json';
import { connect } from 'react-redux';
import Icon from './icon.jsx';

const _ = browser.i18n.getMessage;

const Extra = (props) => {
    return ( <li className={ `${props.type}Wrapper hide-offline` }>
        <Icon type={ Extra.ICONS[props.type] }/>&nbsp;<span className={ props.type }>{ props.value }</span>
    </li> );
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
    return ( <aside><ul className="inline-list">{ extras }</ul></aside> );
};
Extras.propTypes = {
    viewers: PropTypes.number,
    category: PropTypes.string,
    provider: PropTypes.string.isRequired
};

const Avatar = (props) => {
    const srcset = Object.keys(props.image).map((s) => `${props.image[s]} ${s}w`).join(",");
    return ( <img srcSet={ srcset } sizes={ props.size + "px" } /> );
};
Avatar.propTypes = {
    image: PropTypes.objectOf(PropTypes.string).isRequired,
    size: PropTypes.number.isRequired
};

export const CompactChannel = (props) => {
    return ( <li title={ props.uname }>
        <Avatar image={ props.image } size={ 14 }/>
    </li> );
};
CompactChannel.propTypes = {
    uname: PropTypes.string.isRequired,
    image: PropTypes.objectOf(PropTypes.string).isRequired
};

const Redirecting = (props) => {
    const channels = props.channels.map((ch) => {
        return ( <CompactChannel { ...ch } key={ ch.uname }/> );
    });
    return ( <span className="redirecting">
        <ul className="redirectors inline-list">
            { channels }
        </ul>
        →
    </span> );
};
Redirecting.propTypes = {
    channels: PropTypes.arrayOf(PropTypes.shape(CompactChannel.propTypes)).isRequired
};

//TODO size of avatar changes when compact
const InnerChannel = (props) => {
    let extras,
        redirecting,
        title,
        className = '';
    if(props.extras) {
        extras = <Extras { ...props.extras }/>;
    }
    if(props.redirectors) {
        redirecting = <Redirecting channels={ props.redirectors }/>;
    }
    if(props.title && props.liveState !== LiveState.OFFLINE) {
        title = ( <span className="title"><br/>{ props.title }</span> );
    }
    if(props.imageSize !== 30) {
        className = 'compact';
    }
    return ( <div className={ className }>
        <Avatar image={ props.image } size={ props.imageSize }/>
        { redirecting }
        <span className="rebroadcast" hidden={ props.liveState !== LiveState.REBROADCAST }>
            <Icon type="loop"/>
        </span>
        <span className="name">{ props.uname }</span>
        { title }
        { extras }
    </div> );
};
InnerChannel.propTypes = {
    image: PropTypes.objectOf(PropTypes.string).isRequired,
    liveState: PropTypes.oneOf(Object.values(LiveState)).isRequired,
    uname: PropTypes.string.isRequired,
    title: PropTypes.string,
    extras: PropTypes.shape(Extras.propTypes),
    redirectors: PropTypes.arrayOf(PropTypes.shape(CompactChannel.propTypes)),
    imageSize: PropTypes.number
};

const Channel = (props) => {
    const thumbnail = [];
    if(props.thumbnail) {
        thumbnail.push(<img src={ props.thumbnail }/>);
    }
    return ( <li title={ props.uname } className={ `${props.type} ${props.thumbnail ? 'thumbnail' : ''} ${props.external ? 'external' : ''} ${ props.liveState > LiveState.LIVE ? 'nonlive' : '' }` }>
        { thumbnail }
        <InnerChannel image={ props.image } uname={ props.uname } title={ props.title } extras={ props.extras } liveState={ props.liveState } redirectors={ props.redirectors } imageSize={ props.imageSize }/>
    </li> );
};
Channel.propTypes = {
    image: PropTypes.objectOf(PropTypes.string).isRequired,
    liveState: PropTypes.oneOf(Object.values(LiveState)).isRequired,
    uname: PropTypes.string.isRequired,
    title: PropTypes.string,
    type: PropTypes.string.isRequired,
    thumbnail: PropTypes.string,
    extras: PropTypes.shape(Extras.propTypes),
    redirectors: PropTypes.arrayOf(PropTypes.shape(CompactChannel.propTypes)),
    imageSize: PropTypes.number,
    external: PropTypes.bool
};

const ProviderSelector = (props) => {
    const options = [];
    for(const p in props.providers) {
        const provider = props.providers[p];
        if(provider.supports.featured) {
            options.push(<option value={ p }>{ provider.name }</option>);
        }
    }
    return (
        <select className="exploreprovider" value={ props.currentProvider } onChange={ props.onProvider }>
            { options }
        </select>
    );
};
ProviderSelector.propTypes = {
    providers: PropTypes.objectOf(PropTypes.object),
    currentProvider: PropTypes.string,
    onProvider: PropTypes.func.isRequired
};

const ChannelList = (props) => {
    const channels = props.channels.map((ch) => ( <Channel { ...ch } key={ ch.id }/> ));
    return ( <ul role="tabpanel">
        { channels }
    </ul> );
};
ChannelList.propTypes = {
    channels: PropTypes.arrayOf(PropTypes.shape(Channel.propTypes)).isRequired
};

const Channels = (props) => {
    let select;
    if(props.type === 3) {
        select = <ProviderSelector providers={ props.providers } currentProvider={ props.currentProvider } onProvider={ props.onProvider }/>;
        if(props.loading) {
            return ( <div>
                { select }
                <div>{ _('panel_loading') }</div>
            </div> );
        }
    }
    if(!props.channels.length) {
        if(props.searching && props.type !== 3) {
            return ( <div className="tabcontent">{ _('panel_no_results') }</div> );
        }
        else if(props.type === 0) {
            return ( <div className="tabcontent">{ _('panel_nothing_live') }</div> );
        }
        else if(props.type === 2) {
            return ( <div className="tabcontent">{ _('panel_nothing') }</div> );
        }
        else if(props.type === 3) {
            return ( <div className="tabcontent">
                { select }
                <div>{ _('panel_no_results') }</div>
            </div> );
        }
    }
    return ( <div className={ `type${props.type} tabcontent` }>
        { select }
        <ChannelList channels={ props.channels }/>
    </div> );
};
Channels.defaultProps = {
    loading: false,
    searching: false,
    theme: 'light'
};
Channels.propTypes = {
    channels: PropTypes.arrayOf(PropTypes.shape(Channel.propTypes)).isRequired,
    type: PropTypes.oneOf([ 0, 1, 2, 3 ]).isRequired,
    loading: PropTypes.bool,
    providers: PropTypes.objectOf(PropTypes.object).isRequired,
    currentProvider: PropTypes.string,
    onProvider: PropTypes.func.isRequired,
    searching: PropTypes.bool
};

const filterChannels = (channels, query, providers) => {
    query = query.trim();
    if(query) {
        const queries = query.toLowerCase().split(" ");
        return channels.filter((ch) => {
            const tempChannel = [
                providers[ch.type].name.toLowerCase(),
                ch.uname.toLowerCase(),
            ];
            if(ch.title) {
                tempChannel.push(ch.title.toLowerCase());
            }
            if(ch.category) {
                tempChannel.push(ch.category.toLowerCase());
            }

            return queries.every((q) => {
                return tempChannel.some((t) => t.includes(q)) || ch.viewers === q || (ch.redirectors && ch.redirectors.some((r) => r.uname.toLowerCase().includes(q)));
            });
        });
    }
    return channels;
};

const getChannelList = (channels, type, nonLiveDisplay) => {
    const internalRedirects = [],
        externalRedirects = [],
        shownChannels = [];
    for(const channel of channels) {
        if(channel.live.state === LiveState.LIVE && type === 0) {
            shownChannels.push(channel);
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
            shownChannels.push(channel);
        }
        else if(channel.live.state === LiveState.OFFLINE && type === 2) {
            shownChannels.push(channel);
        }
    }

    if(type === 2 && nonLiveDisplay === 2) {
        //TODO format the redirects.
        return shownChannels.concat(internalRedirects, externalRedirects);
    }
    else {
        for(const redirecting of internalRedirects) {
            if((redirecting.live.alternateChannel.live.state === LiveState.LIVE && type === 0) || redirecting.live.alternateChannel.live.state === LiveState.REDIRECT) {
                const target = shownChannels.find((ch) => ch.id === redirecting.live.alternateChannel.id);
                if(!target) {
                    console.warn("Somehow", redirecting, "still has no target");
                }
                else if(!target.redirectors) {
                    target.redirectors = [ redirecting ];
                }
                else {
                    target.redirectors.push(redirecting);
                }
            }
        }
    }
    if(type === nonLiveDisplay) {
        const externals = [];
        for(const redirecting of externalRedirects) {
            const target = externals.find((ch) => ch.login === redirecting.live.alternateChannel.login && ch.type === redirecting.live.alternateChannel.type);
            if(!target) {
                const external = redirecting.live.alternateChannel;
                external.redirectors = [ redirecting ];
                externals.push(external);
            }
            else {
                target.redirectors.push(redirecting);
            }
        }
        return shownChannels.concat(externals);
    }
    return shownChannels;
};

const formatChannel = (channel, providers, type, extras = false, style = "default") => {
    const formattedChannel = {
        uname: channel.uname,
        type: channel.type,
        image: channel.image,
        liveState: channel.live.state,
        imageSize: 30
    };
    if(style === "compact") {
        formattedChannel.imageSize = 12;
    }
    if(extras) {
        formattedChannel.extras = {
            category: channel.category,
            viewers: channel.viewers,
            provider: providers[channel.type].name
        };
    }
    if(channel.live.state !== LiveState.OFFLINE && type !== 2 && style !== "compact") {
        if(style === "thumbnail") {
            formattedChannel.thumbnail = channel.thumbnail;
        }
        formattedChannel.title = channel.title;
    }
    else if(formattedChannel.extras && type === 2) {
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
    if(channel.redirectors) {
        formattedChannel.redirectors = channel.redirectors.map((ch) => ({
            uname: ch.uname,
            image: ch.image
        }));
        delete channel.redirectors;
    }
    return formattedChannel;
};

const sortChannels = (channels, type, formatChannel) => {
    if(type !== 0) {
        return channels.sort((a, b) => a.uname.localeCompare(b.uname.localeCompare)).map(formatChannel);
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
        }).map(formatChannel);
    }
};

const getVisibleChannels = (state) => {
    const saltedFormatChannel = (channel) => formatChannel(channel, state.providers, state.ui.tab, state.settings.extras, state.settings.style);
    if(state.ui.tab !== 3) {
        return sortChannels(filterChannels(getChannelList(state.channels, state.ui.tab, state.settings.nonLiveDisplay), state.ui.query, state.providers), state.settings.nonLiveDisplay, saltedFormatChannel);
    }
    else {
        return sortChannels(state.featured, state.settings.nonLiveDisplay, saltedFormatChannel);
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
        loading: state.ui.loading,
        currentProvider: state.ui.currentProvider,
        searching: state.ui.search && !!state.ui.query.length
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        onProvider(event) {
            dispatch({
                type: "setProvider",
                payload: event.target.value,
                command: "explore"
            });
        }
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(Channels);
