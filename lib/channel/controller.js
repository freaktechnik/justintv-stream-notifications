/**
 * Controller for all the channel stuff. Handles getting info from providers
 * and abstracts the {@link module:channel/list.ChannelList} complications away.
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/controller
 * @requires module:channel/list
 * @requires module:channel/manager
 * @requires module:providers
 * @requires module:providers/events
 * @todo Add tests, at least for the credentials part.
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

const ChannelController = newClass(
/** @lends module:channel/controller.ChannelController.prototype */
{
    extends: EventTarget,
    /**
     * @constructs
     * @argument {Object} [options] - Event listeners.
     * @extends external:sdk/event/target.EventTarget
     * @fires module:channel/controller.ChannelController#channelsadded
     * @fires module:channel/controller.ChannelController#channeldeleted
     * @fires module:channel/controller.ChannelController#channelupdated
     */
    initialize(options) {
        setListeners(this, options);
        this._queue = [];

        this._manager = new ChannelsManager({
            onAddchannel: (name, type) => this.addChannel(name, type),
            onRemovechannel: (channelId) => this.removeChannel(channelId),
            onUpdatechannel: (channelId) => this.updateChannel(channelId),
            onAdduser: (username, type) => this.addUser(username, type),
            onRemoveuser: (userId) => this.removeUser(userId),
            onUpdatefavorites: (userId) => this.updateUser(userId),
            onAutoadd: () => this.autoAddUsers(),
            onGetdata: () => {
                Promise.all([
                    this.getChannelsByType()
                        .then((channels) => channels.forEach((ch) => this._manager.onChannelAdded(ch))),
                    this.getUsersByType()
                        .then((users) => users.forEach((usr) => this._manager.onUserAdded(usr)))
                ]).then(() => this._manager.loading = false);
            }
        });

        /*
         * These are a bunch of helpers for onChanneldelted. The comment there
         * explains more or less what's going on.
         */
        let deletedTypes = new Map();
        // We only want the afterchannelsdeleted event to fire after all channels are gone.
        let debouncedEvent = debounce(() => emit(this, "afterchannelsdeleted"), 500);
        let deleteCallback = (type, channels) => {
            if(channels.length > 0) {
                providers[type].updateRequest(channels);
            }
            else {
                providers[type].removeRequest();
            }
            deletedTypes.delete(type);
            debouncedEvent();
        };

        this._list = new ChannelList({
            onReady: () => {
                this._ready = true;

                // Resolve all the queued up promises.
                this._queue.forEach((r) => r());
                this._queue.length = 0;
            },
            onChannelsadded: (channels) => {
                this._list.getChannelsByType(channels[0].type).then((chans) => {
                    providers[chans[0].type].updateRequest(chans);
                });

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
                this._list.getChannelsByType(channel.type)
                .then(invokeOnce(channel.id, deletedTypes.get(channel.type)));

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
                this._list.addChannels(channels);
            },
            onUpdatedchannels: (channels) => {
                if(Array.isArray(channels))
                    channels.forEach((channel) => this._list.setChannel(channel));
                else
                    this._list.setChannel(channels);
            }
        });
        
        for(let p in providers) {
            this.getChannelsByType(p).then((channels) => {
                if(channels.length)
                    providers[p].updateRequest(channels);
            });
            if(providers[p].supports.favorites) {
                this.getUsersByType(p).then((users) => {
                    if(users.length)
                        providers[p].updateFavsRequest(users);
                });
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
    addChannel(name, type) {
        return providers[type].getChannelDetails(name)
            .then((channel) => this._ensureQueueReady(channel))
            .then((channel) => this._list.addChannel(channel));
    },
    /**
     * Update a channel and store it in the ChannelList.
     * @argument {number} channelId
     * @return {Promise.<module:channel/core.Channel>}
     */
    updateChannel(channelId) {
        return this._ensureQueueReady()
            .then(() => this._list.getChannel(channelId))
            .then((channel) => providers[channel.type].updateChannel(channel.login))
            .then((channel) => this._list.setChannel(channel));
    },
    /**
     * Update channels by provider.
     * @argument {string} [provider = null] - Type of channels to update. All
     *                                        channels are updated if left out.
     * @return {Promise.<(Array.<module:channel/core.Channel>|module:channel/core.Channel)>}
     */
    updateChannels(provider = null) {
        if(provider === null) {
            return Promise.all(Object.keys(providers).map((p) => this.updateChannels(p)));
        }
        else {
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
    addUser(username, type) {
        if(providers[type].supports.favorites) {
            return providers[type].getUserFavorites(username)
            .then((arr) => this._ensureQueueReady(arr))
            .then(([user, channels]) => {
                return Promise.all([
                    this._list.addUser(user),
                    this._list.addChannels(channels)
                ]);
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
     * @return {Promise}
     */
    updateUser(userId) {
        return this._ensureQueueReady()
        .then(() => {
            if(userId)
                return this._list.getUser(userId).then((u) => [u]);
            else
                return this._list.getUsersByType();
        })
        .then((users) => Promise.all([
            users.filter((user) => providers[user.type].supports.favorites)
            .map((user) => {
                return providers[user.type].getUserFavorites(user.login)
                    .then(([updatedUser, channels]) => Promise.all([
                        this._list.setUser(updatedUser),
                        // Can't just call this.getUser(user.login, user.type) because of this.
                        this._list.addChannels(channels.filter((ch) => user.favorites.every((fav) => fav !== ch.login)))
                    ]));
            })
        ]));
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
     * @return {boolean} If any action was taken. False if the provider doesn't
     *                   support adding users from the credentials.
     */
    autoAddUsers(provider) {
        if(!provider || !(provider in providers)) {
            for(let p in providers) {
                this.autoAddUsers(p);
            }
            return true;
        }
        else if(providers[provider].supports.credentials) {
            console.log("Searching login name for "+provider);
            let passwordSearchOnComplete = (credentials) => {
               credentials.forEach((credential) => {
                   console.log("Found a credential for "+provider);
                   this.addUser(credential.username, provider);
               });
            };
            providers[provider].authURL.forEach((url) => {
                passwords.search({
                    url: url,
                    onComplete: passwordSearchOnComplete
                });
            });
            return true;
        }
        else {
            return false;
        }
    },
    /**
     * Opens or focueses a tab with the manager.
     */
    showManager() {
        this._manager.open();
    }
});

exports.ChannelController = ChannelController;
