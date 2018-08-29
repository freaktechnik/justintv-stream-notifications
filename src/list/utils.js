import { pick } from 'lodash';
import LiveState from '../live-state.json';
import {
    LIVE_TAB, OFFLINE_TAB
} from './constants/tabs.json';
import prefs from '../prefs.json';

const FIRST_URL = 0,
    OFFLINE_TYPE = 2,
    SMALL_IMAGE = 12,
    LARGE_IMAGE = 30,
    ONE_ITEM = 1,
    DEFAULT_SORT = prefs.panel_sort_field.value;

export {
    SMALL_IMAGE, LARGE_IMAGE, DEFAULT_SORT
};

export const /*#__PURE__*/ getExternalID = (channel) => `${channel.login}|${channel.type}`;

export const /*#__PURE__*/ compareFormattedIDToRawChannel = (id, channel) => {
    if(typeof id === 'string' || !('id' in channel)) {
        return id === getExternalID(channel);
    }
    return channel.id === id;
};

export const /*#__PURE__*/ formatChannel = (channel, providers, type, extras = false, style = "default", showThumbnails = true, redirected) => {
    const formattedChannel = {
        uname: channel.uname,
        type: channel.type,
        image: channel.image,
        liveState: channel.live.state,
        imageSize: LARGE_IMAGE,
        hasChat: false,
        providerEnabled: providers[channel.type].enabled,
        tooltip: channel.uname,
        url: channel.url[FIRST_URL],
        language: channel.language,
        extras: {
            category: channel.category,
            viewers: channel.viewers,
            liveSince: channel.live.created,
            provider: providers[channel.type].name
        },
        title: channel.title,
        thumbnail: channel.thumbnail,
        showExtras: extras,
        showTitle: false,
        showThumbnail: false,
        showState: type !== OFFLINE_TYPE
    };
    if(style === "compact") {
        formattedChannel.imageSize = SMALL_IMAGE;
    }
    formattedChannel.showExtras = extras;
    if(channel.live.state !== LiveState.OFFLINE && type !== OFFLINE_TYPE && style !== "compact") {
        if(style === "thumbnail" && (!channel.mature || showThumbnails)) {
            formattedChannel.showThumbnail = true;
        }
        formattedChannel.showTitle = true;
    }
    if(channel.live.state !== LiveState.OFFLINE && type !== OFFLINE_TYPE && channel.title) {
        formattedChannel.tooltip += ` - "${channel.title}"`;
    }
    else if(channel.live.state === LiveState.OFFLINE) {
        delete formattedChannel.extras.viewers;
        delete formattedChannel.extras.liveSince;
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
    if(channel.live.state !== LiveState.OFFLINE && type !== OFFLINE_TYPE && redirected && redirected.has(formattedChannel.id)) {
        formattedChannel.redirectors = Array.from(redirected.get(formattedChannel.id).values(), (ch) => pick(ch, [
            'uname',
            'id',
            'image'
        ]));
    }
    if(channel.chatUrl) {
        formattedChannel.hasChat = true;
    }
    return formattedChannel;
};

export const /*#__PURE__*/ getChannelList = (channels, type, nonLiveDisplay) => {
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
        return {
            channels: shownChannels.concat(internalRedirects, externalRedirects),
            redirects: []
        };
    }

    const redirects = internalRedirects.concat(externalRedirects);
    if(type === nonLiveDisplay) {
        const externals = [];
        for(const redirecting of externalRedirects) {
            const target = externals.find((ch) => ch.login === redirecting.live.alternateChannel.login && ch.type === redirecting.live.alternateChannel.type);
            if(!target) {
                const external = redirecting.live.alternateChannel;
                externals.push(external);
            }
        }
        return {
            channels: shownChannels.concat(externals),
            redirects
        };
    }
    return {
        channels: shownChannels,
        redirects
    };
};

export const /*#__PURE__*/ getFieldValue = (obj, path) => {
    const steps = path.split('.');
    if(steps.length > ONE_ITEM) {
        return getFieldValue(obj[steps.shift()], steps.join('.'));
    }
    return obj[path];
};

//TODO this is naughty and modifies the featured channels.
export const /*#__PURE__*/ mergeFeatured = (featured, channels) => {
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
