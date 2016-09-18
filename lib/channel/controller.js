/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/controller
 */
import providers from "../providers";
import passwords from "sdk/passwords";
import ChannelsManager from "./manager";
import ChannelList from "./list";
import EventSink from '../providers/events';
import { emit } from "sdk/event/core";
import Disposable from "../disposable-target";
import { get as _ } from "sdk/l10n";
import { NotificationBox as showNotificationBox } from "notification-box/lib/notification-box";
import self from "sdk/self";
import tabs from "sdk/tabs";
import { partial, debounce } from "sdk/lang/functional";
import { invokeOnce } from "../utils";
import serializedProviders from "../providers/serialized";
import ParentalControls from "../parental-controls";
import { flatten } from "sdk/util/array";
import * as debugDump from "./dump";
import { open } from "preferences-utils";
import clipboard from "sdk/clipboard";
import { prefs } from "sdk/simple-prefs";

/**
 * @event module:channel/controller.ChannelController#channelsadded
 * @type {Array.<module:channel/core.Channel>}
 */
/**
 * @event module:channel/controller.ChannelController#channeldeleted
 * @type {number}
 */
/**
 * @event module:channel/controller.ChannelController#channelupdated
 * @type {module:channel/core.Channel}
 */

const REFRESH_PROFILE_URL = "https://support.mozilla.org/kb/refresh-firefox-reset-add-ons-and-settings",
/**
 * Filters mature channels if parental controls are activated.
 *
 * @param {Array.<module:channel/core.Channel>} channels
 * @returns {Array.<module:channel/core.Channel>} Filtered of channels marked as
 *         mature if parental controls are activated.
 */
    filterInapropriateChannels = (channels) => {
        if(ParentalControls.enabled) {
            return channels.filter((c) => !c.mature);
        }
        else {
            return channels;
        }
    },
    searchCredentials = (url) => new Promise((resolve, reject) => {
        passwords.search({
            url,
            onComplete: resolve,
            onError: reject
        });
    }),
    filterExistingFavs = (user, channels) => channels.filter((ch) => !user.favorites.includes(ch.login));

/**
 * Controller for all the channel stuff. Handles getting info from providers
 * and abstracts the {@link module:channel/list.ChannelList} complications away.
 * @extends module:disposable-target.Disposable
 */
export default class ChannelController extends Disposable {
    /**
     * @type {boolean}
     * @private
     */
    _ready = false;

    /**
     * @param {Object} [options] - Event listeners.
     * @fires module:channel/controller.ChannelController#channelsadded
     * @fires module:channel/controller.ChannelController#channeldeleted
     * @fires module:channel/controller.ChannelController#channelupdated
     */
    constructor(options) {
        super(options);
        /**
         * @type {Array.<function>}
         * @private
         */
        this._queue = [];

        const managerError = (name, type, itemType, canceled = () => false) => {
                if(canceled()) {
                    this._manager.onCancel(name, type, itemType);
                }
                else if(name && type in providers) {
                    this._manager.onError(name, providers[type].name, itemType);
                }
                else {
                    this._manager.onError();
                }
            },
            managerDoneLoading = () => {
                this._manager.loading = false;
            };
        /**
         * @type module:channel/manager.ChannelsManager
         * @private
         */
        this._manager = new ChannelsManager({
            onAddchannel: (name, type, canceled) => this.addChannel(name, type, canceled)
                            .then(() => this._manager._deleteCancelingValue("channel", type, name),
                                  () => managerError(name, type, "channel", canceled)),
            onRemovechannel: (channelId) => this.removeChannel(channelId),
            onUpdatechannel: (channelId) => this.updateChannel(channelId)
                            .catch(managerDoneLoading),
            onAdduser: (username, type, canceled) => this.addUser(username, type, canceled)
                            .then(() => this._manager._deleteCancelingValue("user", type, username),
                                  () => managerError(username, type, "user", canceled)),
            onRemoveuser: (userId) => this.removeUser(userId),
            onUpdatefavorites: (userId) => this.updateUser(userId)
                            .catch(managerDoneLoading),
            onAutoadd: () => this.autoAddUsers().catch(managerDoneLoading),
            onGetdata: () => {
                Promise.all([
                    this.getChannelsByType()
                        .then((channels) => channels.forEach((ch) => this._manager.onChannelAdded(ch))),
                    this.getUsersByType()
                        .then((users) => users.forEach((usr) => this._manager.onUserAdded(usr)))
                ]).then(managerDoneLoading, managerDoneLoading);

                this._manager.addProviders(serializedProviders);
            },
            onDebugdump: () => {
                Promise.all([
                    this.getChannelsByType(),
                    this.getUsersByType()
                ]).then(([ channels, users ]) => {
                    debugDump.copy(channels, users);
                });
            },
            onShowoptions: () => {
                open();
            }
        });

        /*
         * These are a bunch of helpers for onChanneldelted. The comment there
         * explains more or less what's going on.
         */
        const deletedTypes = new Map(),
        // We only want the afterchannelsdeleted event to fire after all channels are gone.
            debouncedEvent = debounce(() => emit(this, "afterchannelsdeleted"), 500),
            deleteCallback = (type) => {
                this._list.getChannelsByType(type).then((channels) => {
                    if(channels.length > 0 && providers[type].enabled) {
                        providers[type].updateRequest(channels);
                    }
                    else {
                        providers[type].removeRequest();
                    }
                    deletedTypes.delete(type);
                    debouncedEvent();
                });
            };
        /**
         * @type module:channel/list.ChannelList
         * @private
         */
        this._list = new ChannelList({
            onReady: () => {
                this._ready = true;

                // Resolve all the queued up promises.
                this._queue.forEach((r) => r());
                this._queue.length = 0;
            },
            onChannelsadded: (channels) => {
                // Assume we always only get an array of channels with the same type.
                if(providers[channels[0].type].enabled) {
                    this._list.getChannelsByType(channels[0].type).then((chans) => {
                        providers[chans[0].type].updateRequest(chans);
                    });
                }

                channels.forEach((chan) => this._manager.onChannelAdded(chan));

                emit(this, "channelsadded", channels);
            },
            onUseradded: (user) => {
                if(providers[user.type].supports.favorites) {
                    this._list.getUsersByType(user.type).then((users) => {
                        providers[user.type].updateFavsRequest(users);
                    });
                }

                this._manager.onUserAdded(user);
            },
            onBeforechanneldeleted: (channelId) => {
                emit(this, "beforechanneldeleted", channelId);
            },
            onChanneldeleted: (channel) => {
                /*
                 * Yeah, this is a bit confusing, but that's why there are
                 * comments explaining it. So sometimes multiple channels get
                 * deleted at once - the channels manager supports multi-selects
                 * But they aren't of the same type. So what we want to do, is
                 * call the unqueueRequest() for each provider exactly once.
                 * To do so, we have to make sure, it only gets called for the
                 * last deleted channel of a type. invokeOnce makes sure only
                 * when the last "invoker" of invokeOnce is calling it, the
                 * method gets executed. Since we have multiple types, there is
                 * a map, storing the callback invokeOnce calls for each type.
                 * And that's all there is to it. Just to reduce requeueing
                 * stuff. Now why should only the last one get invoked?
                 * Because getChannelsByType is async, and in the worst case,
                 * the one without channels to return returns first, which means
                 * an update requests with channels that were deleted would be
                 * queued, which would lead to them being readded to the list.
                 * So this is all totally needed, especially the length of this
                 * very comment is crucial to the operation. For more long
                 * comments, explaining stuff, check out the lib/utils module,
                 * where invokeOnce is kind of explained.
                 */
                if(!deletedTypes.has(channel.type)) {
                    deletedTypes.set(channel.type, partial(deleteCallback, channel.type));
                }
                invokeOnce(channel.id, deletedTypes.get(channel.type));

                this._manager.onChannelRemoved(channel.id);

                emit(this, "channeldeleted", channel.id);
            },
            onUserdeleted: (user) => {
                /* not doing the same mass deletion stuff as for channels, as I
                   assume there are less users and it'd mess up the queue's pausing,
                   if a user is removed because a channel was deleted.
                 */
                if(providers[user.type].supports.favorites) {
                    this._list.getUsersByType(user.type).then((users) => {
                        if(users.length > 0) {
                            providers[user.type].updateFavsRequest(users);
                        }
                        else {
                            providers[user.type].removeFavsRequest();
                        }
                    });
                }

                this._manager.onUserRemoved(user.id);
            },
            onChannelupdated: (channel) => {
                this._manager.onChannelUpdated(channel);

                emit(this, "channelupdated", channel);
            },
            onUserupdated: (user) => {
                this._manager.onUserUpdated(user);
            },
            onClear: (hard) => {
                if(hard) {
                    showNotificationBox({
                        value: "jtvn-dberased",
                        label: _("lost_channels"),
                        priority: "WARNING_HIGH",
                        persistence: 10,
                        image: self.data.url("./icon18.png"),
                        buttons: [
                            {
                                label: _("manageChannels_label"),
                                onClick: () => this.showManager()
                            }
                        ]
                    });
                }
            },
            onUnfixableerror: () => {
                showNotificationBox({
                    value: "jtvn-restorefailed",
                    label: _("restore_failed"),
                    priority: "CRITICAL_LOW",
                    persistence: 10,
                    image: self.data.url("./offline18.png"),
                    buttons: [
                        {
                            label: _("restore_action"),
                            onClick: () => tabs.open({ url: REFRESH_PROFILE_URL })
                        }
                    ]
                });
            }
        });
        // Provider update events

        /**
         * @type module:providers/events.EventSink
         * @private
         */
        this._eventSink = new EventSink({
            onUpdateduser: (user) => {
                this._list.setUser(user);
            },
            onNewchannels: (channels) => {
                channels = filterInapropriateChannels(channels);
                if(channels.length > 0) {
                    this._list.addChannels(channels);
                }
            },
            onUpdatedchannels: (channels) => {
                if(Array.isArray(channels)) {
                    channels.forEach((channel) => this._list.setChannel(channel).catch(() => this._list.addChannel(channel)));
                }
                else {
                    this._list.setChannel(channels).catch(() => this._list.addChannel(channels));
                }
            }
        });

        const channelsCb = (channels) => {
                if(channels.length) {
                    providers[channels[0].type].updateRequest(channels);
                }
            },
            usersCb = (users) => {
                if(users.length) {
                    providers[users[0].type].updateFavsRequest(users);
                }
            };

        for(let p in providers) {
            if(providers[p].enabled) {
                this.getChannelsByType(p).then(channelsCb);
                if(providers[p].supports.favorites) {
                    this.getUsersByType(p).then(usersCb);
                }
            }
        }
    }
    /**
     * Returns a promise that resolves as soon as the ChannelList is ready.
     * Another method in this module that makes magic happen...
     * The promise is resolved with all the arguments this method was called.
     *
     * @param {?} args
     * @async
     * @private
     */
    _ensureQueueReady(...args) {
        if(!this._ready) {
            return new Promise((resolve) => this._queue.push(partial(resolve, ...args)));
        }
        else {
            return Promise.resolve(...args);
        }
    }
    /**
     * Get the details of a channel and store them in the ChannelList.
     *
     * @param {string} name
     * @param {string} type
     * @param {Funtion} [canceled=() => false]
     * @returns {module:channel/core.Channel}
     */
    async addChannel(name, type, canceled = () => false) {
        if(type in providers && providers[type].enabled) {
            const channel = await providers[type].getChannelDetails(name);
            if(ParentalControls.enabled && channel.mature) {
                throw "Not allowed to add this channel";
            }

            await this._ensureQueueReady();

            if(canceled()) {
                throw "Canceled";
            }

            return this._list.addChannel(channel);
        }
        else {
            throw "Provider is disabled";
        }
    }
    /**
     * Update a channel and store it in the ChannelList.
     *
     * @param {number} channelId
     * @returns {module:channel/core.Channel?}
     */
    async updateChannel(channelId) {
        await this._ensureQueueReady();
        let channel = await this._list.getChannel(channelId);
        if(!providers[channel.type].enabled) {
            return null;
        }

        channel = await providers[channel.type].updateChannel(channel.login);
        return this._list.setChannel(channel);
    }
    /**
     * Update channels by provider. Doesn't update if the provider is disabled.
     *
     * @param {string} [provider=null] - Type of channels to update. All
     *                                        channels are updated if left out.
     * @returns {Array.<module:channel/core.Channel>|module:channel/core.Channel}
     */
    async updateChannels(provider = null) {
        if(provider === null || !(provider in providers)) {
            return Promise.all(
                Object.keys(providers)
                .filter((p) => providers[p].enabled)
                .map(this.updateChannels.bind(this))
            );
        }
        else if(providers[provider].enabled) {
            await this._ensureQueueReady();
            let channels = await this._list.getChannelsByType(provider);

            if(channels.length) {
                channels = await providers[provider].updateChannels(channels);
            }

            if(Array.isArray(channels)) {
                return Promise.all(channels.map(this._list.setChannel.bind(this._list)));
            }
            else {
                return this._list.setChannel(channels);
            }
        }
        else {
            return [];
        }
    }
    /**
     * Get a channel.
     *
     * @param {number} channelId - ID of the channel.
     * @returns {module:channel/core.Channel}
     * @async
     */
    getChannel(channelId) {
        return this._ensureQueueReady()
            .then(() => this._list.getChannel(channelId));
    }
    /**
     * Get multiple channels by provider.
     *
     * @param {string} [provider=null] - Type of the channels to return. If
     *                                      left out, all channels are returned.
     * @returns {Array.<module:channel/core.Channel>}
     * @async
     */
    getChannelsByType(provider = null) {
        return this._ensureQueueReady()
            .then(() => this._list.getChannelsByType(provider));
    }
    /**
     * Remove a channel from the ChannelList.
     *
     * @param {number} channelId
     * @returns {module:channel/core.Channel}
     * @async
     */
    removeChannel(channelId) {
        return this._ensureQueueReady()
            .then(() => this._list.removeChannel(channelId));
    }
    /**
     * Add a user and its favorites.
     *
     * @param {string} username
     * @param {string} type
     * @param {Function} [canceled=() => false]
     * @returns {module:channel/core.User} An array with the added user and an array of added
     *                 channels.
     * @throws Gets rejected if the provider doesn't support favorites.
     */
    async addUser(username, type, canceled = () => false) {
        if(type in providers && providers[type].supports.favorites) {
            let [ user, channels ] = await providers[type].getUserFavorites(username);
            await this._ensureQueueReady();

            if(canceled()) {
                throw "Canceled";
            }

            if(ParentalControls.enabled) {
                channels = channels.filter((c) => !c.mature);
            }

            const [ u ] = await Promise.all([
                this._list.addUser(user),
                this._list.addChannels(filterInapropriateChannels(channels))
            ]);
            return u;
        }
        else {
            throw "Can't add users for provider " + type;
        }
    }
    /**
     * @private
     * @param {module:channel/core.User} user
     * @async
     * @returns {module:channel/core.User}
     */
    async _updateUser(user) {
        const [ updatedUser, channels ] = await providers[user.type].getUserFavorites(user.login);
        const [ finalUser ] = await Promise.all([
            this._list.setUser(updatedUser),
            // Can't just call this.addUser(user.login, user.type) because of this.
            this._list.addChannels(filterInapropriateChannels(filterExistingFavs(user, channels)))
        ]);
        return finalUser;
    }
    /**
     * Update a user and add any new favorites.
     *
     * @param {number} [userId] - ID of the user, if not specified updates
     *                               all users.
     * @returns {Array.<module:channel/core.User>}
     */
    async updateUser(userId) {
        await this._ensureQueueReady();
        let users;
        if(userId) {
            users = [ (await this._list.getUser(userId)) ];
        }
        else {
            users = await this.getUsersByType();
        }

        return Promise.all(
            users.filter((user) => providers[user.type].supports.favorites)
            .map(this._updateUser.bind(this))
        );
    }
    /**
     * Get all users of the given type.
     *
     * @param {string} [provider=null] - Type the users should be of. If
     *                                        omuitted all users are returned.
     * @returns {Array.<module:channel/core.User>}
     * @async
     */
    getUsersByType(provider = null) {
        return this._ensureQueueReady()
            .then(() => this._list.getUsersByType(provider));
    }
    /**
     * Remove a user from the ChannelList and optionally remove the channels it
     * favorited.
     *
     * @param {number} userId
     * @param {boolean} [removeFavorites=false]
     * @returns {module:channel/core.User}
     */
    async removeUser(userId, removeFavorites = false) {
        await this._ensureQueueReady();
        let p = Promise.resolve();
        if(removeFavorites) {
            p = this._list.removeChannelsByUserFavorites(userId);
        }
        const [ u ] = await Promise.all([ this._list.removeUser(userId), p ]);
        return u;
    }
    /**
     * @private
     * @async
     * @param {string} provider
     * @param {Array} credentials
     * @returns {Array.<module:channel/core.User>}
     */
    _addFoundCredentials(provider, credentials) {
        return Promise.all(credentials.filter((credential) => credential.username).map((credential) => {
            console.log(`Found a credential for ${provider} user ${credential.username}`);
            return this.addUser(credential.username, provider);
        }));
    }
    /**
     * @private
     * @async
     * @param {string} provider
     * @param {string} url
     * @returns {Array.<module:channel/core.User>}
     */
    _findUsersByURL(provider, url) {
        return searchCredentials(url)
            .then(this._addFoundCredentials.bind(this, provider));
    }
    /**
     * Add users that have stored credentials.
     *
     * @param {string} [provider] - Provider to add users stored in the
     * credentials for. If not provided, all providers are searched.
     * @returns {Array}
     * @async
     */
    autoAddUsers(provider) {
        if(!provider || !(provider in providers)) {
            return Promise.all(Object.keys(providers)
                .filter((p) => providers[p].supports.credentials)
                .map(this.autoAddUsers.bind(this)));
        }
        else if(providers[provider].supports.credentials) {
            console.log(`Searching login name for ${provider}`);
            return Promise.all(providers[provider].authURL.map(this._findUsersByURL.bind(this, provider)))
                .then(flatten);
        }
        else {
            return Promise.reject(`Provider ${provider} does not support auto adding users`);
        }
    }
    /**
     * Opens or focueses a tab with the manager.
     *
     * @async
     */
    showManager() {
        return this._manager.open();
    }

    /**
     * Set the theme of the channel manager.
     *
     * @param {number} theme
     */
    setTheme(theme) {
        this._ensureQueueReady().then(() => this._manager.setTheme(theme));
    }

    /**
     * Copies the stream URL of the given channel to the clipboard.
     *
     * @param {number|string} id - ID or login.
     * @param {string} [type] - Type if not an ID is given.
     */
    async copyChannelURL(id, type) {
        let channel;
        if(type) {
            if(!(type in providers)) {
                throw "Specified type is not known";
            }

            channel = await providers[type].updateChannel(id);
        }
        else {
            channel = await this._list.getChannel(id);
        }

        const url = channel.live.alternateURL ? channel.live.alternateURL : channel.url[0];
        clipboard.set(prefs.copy_pattern.replace("{URL}", url), "text");
        return channel;
    }

    dispose() {
        // Remove all update requests
        for(let p in providers) {
            providers[p].destroy("controller");
        }

        // Remove all event listeners
        this._manager.off();
        this._eventSink.off();
        this._list.off();

        // Everything else, mostly resetting data.
        this._queue.length = 0;
        this._ready = false;
        this._manager.destroy();
        this._list.close();
    }
}
