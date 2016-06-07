/**
 * Controller for all the channel stuff. Handles getting info from providers
 * and abstracts the {@link module:channel/list.ChannelList} complications away.
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/controller
 * @requires module:channel/list
 * @requires module:channel/manager
 * @requires module:channel/dump
 * @requires module:providers
 * @requires module:providers/events
 * @requires module:providers/serialized
 * @requires module:parental-controls
 */
"use strict";

const { Class: newClass } = require("sdk/core/heritage");
const providers = require("../providers");
const passwords = require("sdk/passwords");
const { ChannelsManager } = require("./manager");
const { ChannelList } = require("./list");
const { EventSink } = require('../providers/events');
const { emit, setListeners } = require("sdk/event/core");
const { EventTarget } = require("sdk/event/target");
let { get: _ } = require("sdk/l10n");
const { NotificationBox: showNotificationBox } = require("notification-box/lib/notification-box");
const self = require("sdk/self");
const tabs = require("sdk/tabs");
const { partial, debounce } = require("sdk/lang/functional");
const { invokeOnce } = require("../utils");
const serializedProviders = require("../providers/serialized");
const ParentalControls = require("../parental-controls");
const { Disposable } = require("sdk/core/disposable");
const { defer } = require("sdk/core/promise");
const { flatten } = require("sdk/util/array");
const debugDump = require("./dump");
const { open } = require("preferences-utils");

const REFRESH_PROFILE_URL = "https://support.mozilla.org/kb/refresh-firefox-reset-add-ons-and-settings";

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

/**
 * Filters mature channels if parental controls are activated.
 * @argument {Array.<module:channel/core.Channel>} channels
 * @return {Array.<module:channel/core.Channel>} Filtered of channels marked as
 *         mature if parental controls are activated.
 */
const filterInapropriateChannels = (channels) => {
    if(ParentalControls.enabled)
        return channels.filter((c) => !c.mature);
    else
        return channels;
};

const ChannelController = newClass(
/** @lends module:channel/controller.ChannelController.prototype */
{
    extends: EventTarget,
    implements: [ Disposable ],
    /**
     * @constructs
     * @argument {Object} [options] - Event listeners.
     * @extends external:sdk/event/target.EventTarget
     * @implements external:sdk/core/disposable.Disposable
     * @fires module:channel/controller.ChannelController#channelsadded
     * @fires module:channel/controller.ChannelController#channeldeleted
     * @fires module:channel/controller.ChannelController#channelupdated
     */
    setup(options) {
        setListeners(this, options);
        this._queue = [];

        let managerError = (name, type, itemType, canceled = () => false) => {
            if(canceled())
                this._manager.onCancel(name, type, itemType);
            else if(name && type in providers)
                this._manager.onError(name, providers[type].name, itemType);
            else
                this._manager.onError();
        };
        let managerDoneLoading = () => this._manager.loading = false;
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
                ]).then(([channels, users]) => {
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
        let deletedTypes = new Map();
        // We only want the afterchannelsdeleted event to fire after all channels are gone.
        let debouncedEvent = debounce(() => emit(this, "afterchannelsdeleted"), 500);
        let deleteCallback = (type) => {
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
                if(!deletedTypes.has(channel.type))
                    deletedTypes.set(channel.type, partial(deleteCallback, channel.type));
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
                            onClick: () => tabs.open({url: REFRESH_PROFILE_URL})
                        }
                    ]
                });
            }
        });
        // Provider update events
        this._eventSink = new EventSink({
            onUpdateduser: (user) => {
                this._list.setUser(user);
            },
            onNewchannels: (channels) => {
                channels = filterInapropriateChannels(channels);
                if(channels.length > 0)
                    this._list.addChannels(channels);
            },
            onUpdatedchannels: (channels) => {
                if(Array.isArray(channels))
                    channels.forEach((channel) => this._list.setChannel(channel).catch(() => this._list.addChannel(channel)));
                else
                    this._list.setChannel(channels).catch(() => this._list.addChannel(channels));
            }
        });

        const channelsCb = (channels) => {
            if(channels.length)
                providers[channels[0].type].updateRequest(channels);
        },
        usersCb = (users) => {
            if(users.length)
                providers[users[0].type].updateFavsRequest(users);
        };

        for(let p in providers) {
            if(providers[p].enabled) {
                this.getChannelsByType(p).then(channelsCb);
                if(providers[p].supports.favorites) {
                    this.getUsersByType(p).then(usersCb);
                }
            }
        }
    },
    /**
     * @type {Array.<function>}
     * @private
     */
    _queue: [],
    /**
     * @type {boolean}
     * @private
     */
    _ready: false,
    /**
     * Returns a promise that resolves as soon as the ChannelList is ready.
     * Another method in this module that makes magic happen...
     * The promise is resolved with all the arguments this method was called.
     * @return {Promise}
     * @private
     */
    _ensureQueueReady(...args) {
        if(!this._ready)
            return new Promise((resolve) => this._queue.push(partial(resolve, ...args)));
        else
            return Promise.resolve(...args);
    },
    /**
     * @type module:channel/manager.ChannelsManager
     * @private
     */
    _manager: null,
    /**
     * @type module:channel/list.ChannelList
     * @private
     */
    _list: null,
    /**
     * @type module:providers/events.EventSink
     * @private
     */
    _eventSink: null,
    /**
     * Get the details of a channel and store them in the ChannelList.
     * @argument {string} name
     * @argument {string} type
     * @return {Promise.<module:channel/core.Channel>}
     */
    addChannel(name, type, canceled = () => false) {
        if(type in providers && providers[type].enabled) {
            return providers[type].getChannelDetails(name)
                .then((channel) => {
                    if(ParentalControls.enabled && channel.mature)
                        throw "Not allowed to add this channel";
                    else
                        return channel;
                })
                .then((channel) => this._ensureQueueReady(channel))
                .then((channel) => {
                    if(!canceled())
                        return channel;
                    else
                        throw "Canceled";
                })
                .then((channel) => this._list.addChannel(channel));
        }
        else {
            return Promise.reject("Provider is disabled");
        }
    },
    /**
     * Update a channel and store it in the ChannelList.
     * @argument {number} channelId
     * @return {Promise.<module:channel/core.Channel?>}
     */
    updateChannel(channelId) {
        return this._ensureQueueReady()
            .then(() => this._list.getChannel(channelId))
            .then((channel) => {
                if(providers[channel.type].enabled)
                    return channel;
                else
                    throw "Disabled";
            })
            .then((channel) => providers[channel.type].updateChannel(channel.login))
            .then((channel) => this._list.setChannel(channel))
            .catch((e) => {
                if(e === "Disabled")
                    return null;
                else
                    throw e;
            });
    },
    /**
     * Update channels by provider. Doesn't update if the provider is disabled.
     * @argument {string} [provider = null] - Type of channels to update. All
     *                                        channels are updated if left out.
     * @return {Promise.<(Array.<module:channel/core.Channel>|module:channel/core.Channel)>}
     */
    updateChannels(provider = null) {
        if(provider === null || !(provider in providers)) {
            return Promise.all(
                Object.keys(providers)
                .filter((p) => providers[p].enabled)
                .map((p) => this.updateChannels(p))
            );
        }
        else if(providers[provider].enabled) {
            return this._ensureQueueReady()
            .then(() => this._list.getChannelsByType(provider))
            .then((channels) => {
                if(channels.length) {
                    return providers[provider].updateChannels(channels);
                }
                else {
                    return [];
                }
            }).then((channels) => {
                if(Array.isArray(channels)) {
                    return Promise.all(channels.map((channel) => {
                        return this._list.setChannel(channel);
                    }));
                }
                else {
                    return this._list.setChannel(channels);
                }
            });
        }
        else {
            return Promise.resolve([]);
        }
    },
    /**
     * Get a channel.
     * @argument {number} channelId - ID of the channel.
     * @return {Promise.<module:channel/core.Channel>}
     */
    getChannel(channelId) {
        return this._ensureQueueReady()
            .then(() => this._list.getChannel(channelId));
    },
    /**
     * Get multiple channels by provider.
     * @argument {string} [provider=null] - Type of the channels to return. If
     *                                      left out, all channels are returned.
     * @return {Promise.<Array.<module:channel/core.Channel>>}
     */
    getChannelsByType(provider = null) {
        return this._ensureQueueReady()
            .then(() => this._list.getChannelsByType(provider));
    },
    /**
     * Remove a channel from the ChannelList
     * @argument {number} channelId
     * @return {Promise.<module:channel/core.Channel>}
     */
    removeChannel(channelId) {
        return this._ensureQueueReady()
            .then(() => this._list.removeChannel(channelId));
    },
    /**
     * Add a user and its favorites.
     * @argument {string} username
     * @argument {string} type
     * @return {Promise.<Array>} An array with the added user and an array of
     *                           added channels. Gets rejected if the provider
     *                           doesn't support favorites.
     */
    addUser(username, type, canceled = () => false) {
        if(type in providers && providers[type].supports.favorites) {
            return providers[type].getUserFavorites(username)
            .then((arr) => this._ensureQueueReady(arr))
            .then((arr) => {
                if(!canceled())
                    return arr;
                else
                    throw "Canceled";
            })
            .then(([user, channels]) => {
                if(ParentalControls.enabled)
                    channels = channels.filter((c) => !c.mature);

                return Promise.all([
                    this._list.addUser(user),
                    this._list.addChannels(filterInapropriateChannels(channels))
                ]).then(([u, c]) => u);
            });
        }
        else {
            return Promise.reject();
        }
    },
    /**
     * Update a user and add any new favorites.
     * @argument {number} [userId] - ID of the user, if not specified updates
     *                               all users.
     * @return {Promise.<Array>}
     */
    updateUser(userId) {
        return this._ensureQueueReady()
        .then(() => {
            if(userId)
                return this._list.getUser(userId).then((u) => [u]);
            else
                return this.getUsersByType();
        })
        .then((users) => Promise.all(
            users.filter((user) => providers[user.type].supports.favorites)
            .map((user) => {
                return providers[user.type].getUserFavorites(user.login)
                    .then(([updatedUser, channels]) => Promise.all([
                            this._list.setUser(updatedUser),
                            // Can't just call this.addUser(user.login, user.type) because of this.
                            this._list.addChannels(
                                filterInapropriateChannels(
                                    channels.filter(
                                        (ch) => user.favorites.every(
                                            (fav) => fav !== ch.login
                                        )
                                    )
                                )
                            )
                    ])).then(([user, channels]) => user);
            })
        ));
    },
    /**
     * Get all users of the given type.
     * @argument {string} [provider = null] - Type the users should be of. If
     *                                        omuitted all users are returned.
     * @return {Promise.<Array.<module:channel/core.User>>}
     */
    getUsersByType(provider = null) {
        return this._ensureQueueReady()
            .then(() => this._list.getUsersByType(provider));
    },
    /**
     * Remove a user from the ChannelList and optionally remove the channels it
     * favorited.
     * @argument {number} userId
     * @argument {boolean} [removeFavorites=false]
     * @return {Promise.<module:channel/core.User>}
     */
    removeUser(userId, removeFavorites = false) {
        let p = Promise.resolve();
        if(removeFavorites) {
            p = this._list.removeChannelsByUserFavorites(userId);
        }
        return this._ensureQueueReady()
            .then(() => Promise.all([this._list.removeUser(userId), p]))
            .then(([u, chans]) => u);
    },
    /**
     * Add users that have stored credentials.
     * @argument {string} [provider] - Provider to add users stored in the
     * credentials for. If not provided, all providers are searched.
     * @return {Promise.<Array>}
     */
    autoAddUsers(provider) {
        if(!provider || !(provider in providers)) {
            return Promise.all(Object.keys(providers)
                .filter((p) => providers[p].supports.credentials)
                .map((p) => this.autoAddUsers(p)));
        }
        else if(providers[provider].supports.credentials) {
            console.log("Searching login name for "+provider);
            return Promise.all(providers[provider].authURL.map((url) => {
                let { promise, resolve, reject } = defer();
                passwords.search({
                    url: url,
                    onComplete: (credentials) => {
                        Promise.all(credentials.map((credential) => {
                            console.log("Found a credential for "+provider+" user "+credential.username);
                            return this.addUser(credential.username, provider);
                        })).then(resolve, reject);
                    },
                    onError: reject
                });
                return promise;
            })).then((arr) => flatten(arr));
        }
        else {
            return Promise.reject();
        }
    },
    /**
     * Opens or focueses a tab with the manager.
     * @return Promise
     */
    showManager() {
        return this._manager.open();
    },
    dispose() {
        // Remove all update requests
        for(let p in providers) {
            providers[p].removeRequest();
            if(providers[p].supports.favorites)
                providers[p].removeFavsRequest();
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
});

exports.ChannelController = ChannelController;
