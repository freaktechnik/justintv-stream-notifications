import LiveState from '../live-state.json';
import { LIVE_TAB, OFFLINE_TAB, EXTRAS_TAB } from './constants/tabs.json';
import storeTypes from './constants/store-types.json';

const FIRST_URL = 0,
    OFFLINE_TYPE = 2,
    SMALL_IMAGE = 12,
    LARGE_IMAGE = 30,
    BIGGER = 1,
    SMALLER = -1;

export { SMALL_IMAGE, LARGE_IMAGE };

export const getExternalID = (channel) => `${channel.login}|${channel.type}`;

export const formatChannel = (channel, providers, type, extras = false, style = "default", showThumbnails = true) => {
    const formattedChannel = {
        uname: channel.uname,
        type: channel.type,
        image: channel.image,
        liveState: channel.live.state,
        imageSize: LARGE_IMAGE,
        hasChat: false,
        providerEnabled: providers[channel.type].enabled,
        tooltip: channel.uname,
        url: channel.url[FIRST_URL]
    };
    if(style === "compact") {
        formattedChannel.imageSize = SMALL_IMAGE;
    }
    if(extras) {
        formattedChannel.extras = {
            category: channel.category,
            viewers: channel.viewers,
            provider: providers[channel.type].name
        };
    }
    if(channel.live.state !== LiveState.OFFLINE && type !== OFFLINE_TYPE && style !== "compact") {
        if(style === "thumbnail" && (!channel.mature || showThumbnails)) {
            formattedChannel.thumbnail = channel.thumbnail;
        }
        formattedChannel.title = channel.title;
    }
    else if(formattedChannel.extras && type === OFFLINE_TYPE) {
        delete formattedChannel.extras.viewers;
        delete formattedChannel.extras.category;
    }
    if(channel.live.state !== LiveState.OFFLINE && type !== OFFLINE_TYPE && channel.title) {
        formattedChannel.tooltip += ` - "${channel.title}"`;
    }

    if("id" in channel) {
        formattedChannel.id = channel.id;
        formattedChannel.external = false;
    }
    else {
        formattedChannel.external = true;
        formattedChannel.id = getExternalID(channel);
        formattedChannel.chatUrl = channel.chatUrl;
    }
    if(channel.redirectors) {
        formattedChannel.redirectors = channel.redirectors.map((ch) => ({
            uname: ch.uname,
            image: ch.image,
            id: ch.id
        }));
        delete channel.redirectors;
    }
    if(channel.chatUrl) {
        formattedChannel.hasChat = true;
    }
    return formattedChannel;
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

export const getVisibleChannels = (state) => {
    const saltedFormatChannel = (channel) => formatChannel(channel, state.providers, state.ui.tab, state.settings.extras, state.settings.style, state.settings.showMatureThubms);
    if(state.ui.tab !== EXTRAS_TAB) {
        return sortChannels(filterChannels(getChannelList(state.channels, state.ui.tab, state.settings.nonLiveDisplay), state.ui.query, state.providers), state.settings.nonLiveDisplay, saltedFormatChannel);
    }

    const channels = mergeFeatured(state.featured, state.channels);
    return sortChannels(channels, state.settings.nonLiveDisplay, saltedFormatChannel);
};

export const CHANNEL_ACTIONS = {
    OPEN: 0,
    ARCHIVE: 1,
    CHAT: 2,
    CONTEXT: 3,
    COPY: 4,
    LIVESTREAMER: 5
};

const ACTION_MAP = [
    {
        internal: 'open',
        external: 'open',
        internalProp: 'id',
        externalProp: 'url'
    },
    {
        internal: 'openArchive',
        external: 'open',
        internalProp: 'id',
        externalProp: 'url'
    },
    {
        internal: 'openChat',
        external: 'open',
        internalProp: 'id',
        externalProp: 'chatUrl'
    },
    {
        internal: storeTypes.SET_CONTEXT_CHANNEL,
        external: storeTypes.SET_CONTEXT_CHANNEL,
        internalProp: '',
        externalProp: ''
    },
    {
        internal: storeTypes.COPY,
        external: storeTypes.COPY,
        internalProp: '',
        externalProp: ''
    },
    {
        internal: 'openLivestreamer',
        external: 'openLivestreamer',
        internalProp: 'id',
        externalProp: 'url'
    }
];
const STATE_TYPES = Array.from(Object.values(storeTypes));

const getMessageInfo = (action, channel) => {
    const spec = ACTION_MAP[parseInt(action, 10)];
    let type, payload;
    if(channel.external) {
        type = spec.external;
        payload = spec.externalProp;
    }
    else {
        type = spec.internal;
        payload = spec.internalProp;
    }
    return {
        type,
        payload
    };
};

export const getChannelAction = (action, channel) => {
    const message = {};
    const {
        type,
        payload
    } = getMessageInfo(action, channel);
    if(STATE_TYPES.includes(type)) {
        message.type = type;
    }
    else {
        message.command = type;
    }

    if(payload.length) {
        message.payload = channel[payload];
    }
    else {
        message.payload = channel;
    }
    return message;
};

export const shouldClose = (action, channel) => {
    const { type } = getMessageInfo(action, channel);
    return !STATE_TYPES.includes(type);
};
