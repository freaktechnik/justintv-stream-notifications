import { pick } from 'lodash';
import LiveState from '../live-state.json';
import {
    LIVE_TAB, OFFLINE_TAB, EXPLORE_TAB
} from './constants/tabs.json';
import SORT_FIELDS from './constants/sort.json';
import prefs from '../prefs.json';

const FIRST_URL = 0,
    OFFLINE_TYPE = 2,
    SMALL_IMAGE = 12,
    LARGE_IMAGE = 30,
    BIGGER = 1,
    SMALLER = -1,
    NEUTRAL = 0,
    DEFAULT_SORT = prefs.panel_sort_field.value;

export {
    SMALL_IMAGE, LARGE_IMAGE, DEFAULT_SORT
};

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
        showThumbnail: false
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
    else if(type === OFFLINE_TYPE) {
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
    if(channel.redirectors) {
        formattedChannel.redirectors = channel.redirectors.map((ch) => pick(ch, [
            'uname',
            'id',
            'image'
        ]));
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

const getChannelList = (channels, type, nonLiveDisplay, calculateRedirecting = true) => {
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

    if(calculateRedirecting) {
        for(const redirecting of internalRedirects) {
            if((redirecting.live.alternateChannel.live.state === LiveState.LIVE && type === LIVE_TAB) || redirecting.live.alternateChannel.live.state === LiveState.REDIRECT) {
                const target = shownChannels.find((ch) => ch.id === redirecting.live.alternateChannel.id);
                if(!target) {
                    console.warn("Somehow", redirecting, "still has no target");
                }
                else if(!target.redirectors) {
                    target.redirectors = [ redirecting ];
                }
                else if(!target.redirectors.some((r) => r.id === redirecting.id)) {
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
                if(calculateRedirecting) {
                    external.redirectors = [ redirecting ];
                }
                externals.push(external);
            }
            else if(calculateRedirecting && !target.redirectors.some((r) => r.id === redirecting.id)) {
                target.redirectors.push(redirecting);
            }
        }
        return shownChannels.concat(externals);
    }
    return shownChannels;
};

export const getFieldValue = (obj, path) => {
    const steps = path.split('.');
    if(steps.length > BIGGER) {
        return getFieldValue(obj[steps.shift()], steps.join('.'));
    }
    return obj[path];
};

const sortChannels = (channels, type, formatChannelCbk, sortField = DEFAULT_SORT, sortDirection = false) => {
    let sorter;
    const sortFieldDesc = SORT_FIELDS[sortField],
        sortType = sortFieldDesc.type == 'number' ? (a, b) => a - b : (a, b) => a.localeCompare(b),
        fieldPath = sortFieldDesc.fieldPath,
        basicSort = (a, b) => {
            const aVal = getFieldValue(a, fieldPath),
                bVal = getFieldValue(b, fieldPath);
            if(sortDirection === sortFieldDesc.direction) {
                return sortType(aVal, bVal);
            }
            return sortType(bVal, aVal);
        };
    if(type !== LIVE_TAB) {
        sorter = basicSort;
    }
    else {
        const liveStateSort = (a, b) => {
            if(a.live.state > LiveState.LIVE && b.live.state <= LiveState.LIVE) {
                return BIGGER;
            }
            else if(b.live.state > LiveState.LIVE && a.live.state <= LiveState.LIVE) {
                return SMALLER;
            }
            return NEUTRAL;
        };
        sorter = (a, b) => {
            if(!sortFieldDesc.discrete) {
                const liveStateVal = liveStateSort(a, b);
                if(liveStateVal !== NEUTRAL) {
                    return liveStateVal;
                }
            }
            else {
                const basicVal = basicSort(a, b);
                if(basicVal === NEUTRAL) {
                    return liveStateSort(a, b);
                }
                return basicVal;
            }

            return basicSort(a, b);
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
    const saltedFormatChannel = (channel) => formatChannel(channel, state.providers, state.ui.tab, state.settings.extras, state.settings.style, state.settings.showMatureThumbs);
    if(state.ui.tab !== EXPLORE_TAB) {
        return sortChannels(filterChannels(getChannelList(state.channels, state.ui.tab, state.settings.nonLiveDisplay), state.ui.query, state.providers), state.settings.nonLiveDisplay, saltedFormatChannel, state.ui.sortField, state.ui.sortDirection);
    }

    const channels = mergeFeatured(state.featured, state.channels);
    return sortChannels(channels, state.settings.nonLiveDisplay, saltedFormatChannel, state.ui.sortField, state.ui.sortDirection);
};

export const getChannelCount = (state, tab) => {
    if(tab != EXPLORE_TAB) {
        //TODO cache that count somewhere?
        return getChannelList(state.channels, tab, state.settings.nonLiveDisplay, false).length;
    }
    return FIRST_URL;
};
