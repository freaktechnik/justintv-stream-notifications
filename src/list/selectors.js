import {
    createSelector,
    createStructuredSelector
} from 'reselect';
import {
    formatChannel,
    getFieldValue,
    mergeFeatured,
    getExternalID,
    getChannelList,
    compareFormattedIDToRawChannel
} from './utils.js';
import SORT_FIELDS from './constants/sort.json';
import {
    LIVE_TAB,
    NONLIVE_TAB,
    OFFLINE_TAB,
    EXPLORE_TAB
} from './constants/tabs.json';
import LiveState from '../live-state.json';

const BIGGER = 1,
    SMALLER = -1,
    NEUTRAL = 0,
    EMPTY = 0;

const getLoading = (state) => state.ui.loading;
const getProviders = (state) => state.providers;
const getNonliveDisplay = (state) => state.settings.nonLiveDisplay;
const getQuery = (state) => state.ui.query;
const getSortField = (state) => state.ui.sortField;
const getSortDirection = (state) => state.ui.sortDirection;
const getShowMatureThumbs = (state) => state.settings.showMatureThumbs;
const getShowExtras = (state) => state.settings.extras;
const getStyle = (state) => state.settings.style;
const getCurrentTab = (state) => state.ui.tab;
const getChannels = (state) => state.channels;
const getFeatured = (state) => state.featured;
const getShowBadges = (state) => state.ui.badges;
const getContextChannelID = (state) => state.ui.contextChannel;
const getQueueContext = (state) => state.ui.queueContext;

const makeChannelsSelector = (tabGetter) => createSelector(
    getChannels,
    getFeatured,
    getNonliveDisplay,
    tabGetter,
    (channels, featured, nonLiveDisplay, tab) => {
        if(tab === EXPLORE_TAB) {
            return {
                channels: mergeFeatured(featured, channels),
                redirects: []
            };
        }
        else if(tab === NONLIVE_TAB && nonLiveDisplay !== NONLIVE_TAB) {
            return {
                channels: [],
                redirects: []
            };
        }
        return getChannelList(channels, tab, nonLiveDisplay);
    }
);

const makeGetChannelCount = (tab) => {
    if(tab === EXPLORE_TAB) {
        return () => EMPTY;
    }
    return createSelector(
        makeChannelsSelector(() => tab),
        ({ channels }) => channels.length
    );
};

const getStructuredCounts = createStructuredSelector({
    live: makeGetChannelCount(LIVE_TAB),
    nonlive: makeGetChannelCount(NONLIVE_TAB),
    offline: makeGetChannelCount(OFFLINE_TAB)
});

export const getChannelCounts = createSelector(
    getShowBadges,
    getStructuredCounts,
    (showBadges, channelCounts) => {
        if(!showBadges) {
            return {};
        }
        return channelCounts;
    }
);

const getAllChannelsForTab = makeChannelsSelector(getCurrentTab);

const getChannelsForTab = createSelector(
    getAllChannelsForTab,
    ({ channels }) => channels
);

const getRedirectsForTab = createSelector(
    getAllChannelsForTab,
    ({ redirects }) => {
        const redirectors = new Map();
        for(const ch of redirects) {
            let targetId;
            if("id" in ch.live.alternateChannel) {
                targetId = ch.live.alternateChannel.id;
            }
            else {
                targetId = getExternalID(ch.live.alternateChannel);
            }
            if(!redirectors.has(targetId)) {
                redirectors.set(targetId, new Set());
            }
            redirectors.get(targetId).add(ch);
        }
        return redirectors;
    }
);

const getFilteredChannels = createSelector(
    getChannelsForTab,
    getQuery,
    getProviders,
    getCurrentTab,
    (channels, query, providers, type) => {
        query = query.trim();
        if(query && type !== EXPLORE_TAB) {
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
    }
);

const getSortedChannels = createSelector(
    getFilteredChannels,
    getCurrentTab,
    getSortField,
    getSortDirection,
    (channels, type, field, direction) => {
        let sorter;
        const sortFieldDesc = SORT_FIELDS[field],
            collator = new Intl.Collator(),
            sortType = sortFieldDesc.type == 'number' ? (a, b) => a - b : (a, b) => collator.compare(a, b),
            fieldPath = sortFieldDesc.fieldPath,
            basicSort = (a, b) => {
                const aVal = getFieldValue(a, fieldPath),
                    bVal = getFieldValue(b, fieldPath);
                if(direction === sortFieldDesc.direction) {
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
        return channels.slice().sort(sorter);
    }
);

export const getVisibleChannels = createSelector(
    getLoading,
    getSortedChannels,
    getProviders,
    getCurrentTab,
    getShowExtras,
    getStyle,
    getShowMatureThumbs,
    getRedirectsForTab,
    (loading, channels, providers, ...args) => {
        if(loading || !providers) {
            return [];
        }
        return channels.map((ch) => formatChannel(ch, providers, ...args));
    }
);

const getListContextChannel = createSelector(
    getContextChannelID,
    getChannels,
    (id, channels) => {
        if(id) {
            let external;
            const channel = channels.find((ch) => {
                if(ch.live.alternateChannel && compareFormattedIDToRawChannel(id, ch.live.alternateChannel)) {
                    external = ch.live.alternateChannel;
                    return true;
                }
                return compareFormattedIDToRawChannel(id, ch);
            });
            if(external) {
                return external;
            }
            return channel;
        }
    }
);
const getExploreContextChannel = createSelector(
    getContextChannelID,
    getFeatured,
    (id, featured) => {
        if(id && typeof id === 'string') {
            return featured.find((ch) => compareFormattedIDToRawChannel(id, ch));
        }
    }
);

export const getContextChannel = createSelector(
    getExploreContextChannel,
    getListContextChannel,
    getProviders,
    getCurrentTab,
    getShowMatureThumbs,
    getRedirectsForTab, //TODO this doesn't show redirects when channel changes state and isn't in current tab anymore.
    (exploreChannel, listChannel, providers, tab, showMatureThumbs, redirectors) => {
        const channel = tab === EXPLORE_TAB ? exploreChannel : listChannel;
        if(channel && providers) {
            return formatChannel(channel, providers, LIVE_TAB, true, 'thumbnail', showMatureThumbs, redirectors);
        }
    }
);

export const getContextMenuType = createSelector(
    getContextChannelID,
    getQueueContext,
    (contextChannel, queueContext) => {
        if(contextChannel) {
            return 'channel';
        }
        else if(queueContext) {
            return 'queue';
        }
        return '';
    }
);

export const getShowContextMenu = createSelector(
    getContextMenuType,
    (type) => !!type
);
