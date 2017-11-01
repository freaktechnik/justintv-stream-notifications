import React from 'react';
import PropTypes from 'prop-types';
import LiveState from '../../live-state.json';
import { connect } from 'react-redux';
import Icon from './icon.jsx';
import { formatChannel, SMALL_IMAGE, LARGE_IMAGE } from '../utils';
import { NavigateableItem, NavigateableList } from './navigateable-list.jsx';
import { LIVE_TAB, NONLIVE_TAB, OFFLINE_TAB, EXTRAS_TAB } from '../constants/tabs.json';

const _ = browser.i18n.getMessage;

const Extra = (props) => ( <li className={ `${props.type}Wrapper hide-offline` }>
    <Icon type={ Extra.ICONS[props.type] }/>&nbsp;<span className={ props.type }>{ props.value }</span>
</li> );
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
    if("viewers" in props && props.viewers) {
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
    const srcset = Object.keys(props.image).map((s) => `${props.image[s]} ${s}w`)
        .join(",");
    return ( <img srcSet={ srcset } sizes={ `${props.size}px` } alt="Avatar" /> );
};
Avatar.propTypes = {
    image: PropTypes.objectOf(PropTypes.string).isRequired,
    size: PropTypes.number.isRequired
};

export const CompactChannel = (props) => ( <li title={ props.uname } onClick={ props.onClick } tabIndex={ 0 } onKeyUp={ (e) => {
    if(e.key === ' ' || e.key === 'Enter') {
        props.onClick(e);
    }
} } role="link">
    <Avatar image={ props.image } size={ SMALL_IMAGE }/>
</li> );
CompactChannel.propTypes = {
    uname: PropTypes.string.isRequired,
    image: PropTypes.objectOf(PropTypes.string).isRequired,
    onClick: PropTypes.func.isRequired
};
const redirectorsShape = PropTypes.arrayOf(PropTypes.shape({
    uname: PropTypes.string.isRequired,
    image: PropTypes.objectOf(PropTypes.string).isRequired,
    id: PropTypes.number.isRequired
}));

const Redirecting = (props) => {
    const channels = props.channels.map((ch) => {
        const onClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            props.onRedirectorClick(ch.id);
        };
        return ( <CompactChannel { ...ch } onClick={ onClick } key={ ch.uname }/> );
    });
    return ( <span className="redirecting">
        <ul className="redirectors inline-list">
            { channels }
        </ul>
        →
    </span> );
};
Redirecting.propTypes = {
    channels: redirectorsShape.isRequired,
    onRedirectorClick: PropTypes.func.isRequired
};

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
        title = ( <span className="title"><br/>{ props.title }</span> );
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
    onRedirectorClick: PropTypes.func.isRequired
};

class Channel extends NavigateableItem {
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

const ProviderSelector = (props) => {
    const options = [];
    for(const p in props.providers) {
        const provider = props.providers[p];
        if(provider.supports.featured) {
            options.push(<option value={ p }>{ provider.name }</option>);
        }
    }
    return (
        <select className="exploreprovider browser-style" value={ props.currentProvider } onBlur={ props.onProvider }>
            { options }
        </select>
    );
};
ProviderSelector.propTypes = {
    providers: PropTypes.objectOf(PropTypes.object),
    currentProvider: PropTypes.string,
    onProvider: PropTypes.func.isRequired
};

const channelsShape = PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.string
        ]).isRequired,
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
        tooltip: PropTypes.string.isRequired
    })),
    ChannelList = (props) => {
        const channels = props.channels.map((ch) => {
            const onClick = ch.external ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    props.onExternalChannel(ch.url);
                } : (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    props.onChannel(ch.id);
                },
                onContextMenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    props.onContext(ch);
                };
            return ( <Channel { ...ch } onClick={ onClick } onRedirectorClick={ props.onChannel } onContextMenu={ onContextMenu } onCopy={ props.onCopy } key={ ch.id }/> );
        });
        const element = ( <NavigateableList>
            { channels }
        </NavigateableList> );
        return React.cloneElement(element, {
            role: "tabpanel"
        });
    };
ChannelList.propTypes = {
    channels: channelsShape.isRequired,
    onChannel: PropTypes.func.isRequired,
    onExternalChannel: PropTypes.func.isRequired,
    onContext: PropTypes.func.isRequired,
    onCopy: PropTypes.func.isRequired
};

const Channels = (props) => {
    let select;
    if(props.type === EXTRAS_TAB) {
        select = <ProviderSelector providers={ props.providers } currentProvider={ props.currentProvider } onProvider={ props.onProvider }/>;
        if(props.loading) {
            return ( <div className="loading tabcontent">
                { select }
                <div>{ _('panel_loading') }</div>
            </div> );
        }
    }
    if(!props.channels.length) {
        if(props.searching && props.type !== EXTRAS_TAB) {
            return ( <div className="tabcontent">{ _('panel_no_results') }</div> );
        }
        else if(props.type === LIVE_TAB) {
            return ( <div className="tabcontent">{ _('panel_nothing_live') }</div> );
        }
        else if(props.type === OFFLINE_TAB) {
            return ( <div className="tabcontent">{ _('panel_nothing') }</div> );
        }
        else if(props.type === EXTRAS_TAB) {
            return ( <div className="tabcontent">
                { select }
                <div>{ _('panel_no_results') }</div>
            </div> );
        }
    }
    return ( <div className={ `type${props.type} tabcontent` }>
        { select }
        <ChannelList channels={ props.channels } onChannel={ props.onChannel } onExternalChannel={ props.onExternalChannel } onContext={ props.onContext } onCopy={ props.onCopy }/>
    </div> );
};
Channels.defaultProps = {
    loading: false,
    searching: false,
    theme: 'light'
};
Channels.propTypes = {
    channels: channelsShape.isRequired,
    type: PropTypes.oneOf([
        LIVE_TAB,
        NONLIVE_TAB,
        OFFLINE_TAB,
        LIVE_TAB
    ]).isRequired,
    loading: PropTypes.bool,
    providers: PropTypes.objectOf(PropTypes.object).isRequired,
    currentProvider: PropTypes.string,
    onProvider: PropTypes.func.isRequired,
    searching: PropTypes.bool,
    onChannel: PropTypes.func.isRequired,
    onExternalChannel: PropTypes.func.isRequired,
    onContext: PropTypes.func.isRequired,
    onCopy: PropTypes.func.isRequired
};

const filterChannels = (channels, query, providers) => {
    query = query.trim();
    if(query) {
        const queries = query.toLowerCase().split(" ");
        return channels.filter((ch) => {
            const tempChannel = [
                providers[ch.type].name.toLowerCase(),
                ch.uname.toLowerCase()
            ];
            if(ch.title) {
                tempChannel.push(ch.title.toLowerCase());
            }
            if(ch.category) {
                tempChannel.push(ch.category.toLowerCase());
            }

            return queries.every((q) => tempChannel.some((t) => t.includes(q)) || ch.viewers === q || (ch.redirectors && ch.redirectors.some((r) => r.uname.toLowerCase().includes(q))));
        });
    }
    return channels;
};

const getChannelList = (channels, type, nonLiveDisplay) => {
    const internalRedirects = [],
        externalRedirects = [],
        shownChannels = [];
    for(const channel of channels) {
        if(channel.live.state === LiveState.LIVE && type === LIVE_TAB) {
            shownChannels.push(channel);
        }
        else if(channel.live.state === LiveState.REDIRECT) {
            if(!channel.live.alternateChannel) {
                console.warn("this shouldn't be here", channel);
            }
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
        else if(channel.live.state === LiveState.OFFLINE && type === OFFLINE_TAB) {
            shownChannels.push(channel);
        }
    }

    if(type === OFFLINE_TAB && nonLiveDisplay === OFFLINE_TAB) {
        return shownChannels.concat(internalRedirects, externalRedirects);
    }

    for(const redirecting of internalRedirects) {
        if((redirecting.live.alternateChannel.live.state === LiveState.LIVE && type === LIVE_TAB) || redirecting.live.alternateChannel.live.state === LiveState.REDIRECT) {
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

const sortChannels = (channels, type, formatChannelCbk) => {
    let sorter;
    if(type !== LIVE_TAB) {
        sorter = (a, b) => a.uname.localeCompare(b.uname);
    }
    else {
        const BIGGER = 1,
            SMALLER = -1;
        sorter = (a, b) => {
            if(a.live.state > LiveState.LIVE && b.live.state <= LiveState.LIVE) {
                return BIGGER;
            }
            else if(b.live.state > LiveState.LIVE && a.live.state <= LiveState.LIVE) {
                return SMALLER;
            }

            return a.uname.localeCompare(b.uname);
        };
    }
    return channels.sort(sorter).map(formatChannelCbk);
};

const mergeFeatured = (featured, channels) => {
    for(const channel of featured) {
        const internalChannel = channels.find((ch) => ch.login === channel.login && ch.type === channel.type);
        if(internalChannel) {
            channel.id = internalChannel.id;
        }
        else {
            delete channel.id;
        }
    }
    return featured;
};

const getVisibleChannels = (state) => {
    const saltedFormatChannel = (channel) => formatChannel(channel, state.providers, state.ui.tab, state.settings.extras, state.settings.style, state.settings.showMaturThubms);
    if(state.ui.tab !== EXTRAS_TAB) {
        return sortChannels(filterChannels(getChannelList(state.channels, state.ui.tab, state.settings.nonLiveDisplay), state.ui.query, state.providers), state.settings.nonLiveDisplay, saltedFormatChannel);
    }

    const channels = mergeFeatured(state.featured, state.channels);
    return sortChannels(channels, state.settings.nonLiveDisplay, saltedFormatChannel);
};

const mapStateToProps = (state) => ({
    channels: getVisibleChannels(state),
    extras: state.settings.extras,
    style: state.settings.style,
    type: state.ui.tab,
    nonLiveDisplay: state.settings.nonLiveDisplay,
    providers: state.providers,
    loading: state.ui.loading,
    currentProvider: state.ui.currentProvider,
    searching: state.ui.search && !!state.ui.query.length
});
const mapDispatchToProps = (dispatch) => ({
    onProvider(event) {
        dispatch({
            type: "setProvider",
            payload: event.target.value,
            command: "explore"
        });
    },
    onChannel(channelId) {
        dispatch({
            command: "open",
            payload: channelId
        });
        window.close();
    },
    onExternalChannel(url) {
        dispatch({
            command: "openUrl",
            payload: url
        });
        window.close();
    },
    onContext(channel) {
        dispatch({
            type: "setContextChannel",
            payload: channel
        });
    },
    onCopy(payload) {
        dispatch({
            type: "copy",
            payload
        });
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(Channels);
