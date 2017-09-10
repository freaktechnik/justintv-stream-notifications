/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/controller
 */
import providers from "../providers";
import ChannelsManager from "./manager";
import ChannelList from "./list";
import EventSink from '../providers/events';
import { emit, pipe } from "../../utils";
import ParentalControls from "../parental-controls";
import { flatten, debounce } from "underscore";
import * as debugDump from "./dump";
import prefs from "../../preferences";
import * as logins from "../logins";
import EventTarget from 'event-target-shim';
import ErrorState from '../error-state';
import { formatChannel, formatChannels, filterExistingFavs } from './utils';
import { CantOpenListError } from '../../database-manager';

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
    ACCEPT_COOKIES_URL = "http://streamnotifier.ch/help/accept-cookies",
    /**
     * Filters mature channels if parental controls are activated.
     *
     * @param {Array.<module:channel/core.Channel>} channels - Channels to filter.
     * @returns {Array.<module:channel/core.Channel>} Filtered of channels marked as
     *          mature if parental controls are activated.
     */
    filterInapropriateChannels = (channels) => {
        if(ParentalControls.enabled) {
            return channels.filter((c) => !c.mature);
        }
        else {
            return channels;
        }
    };

/**
 * Controller for all the channel stuff. Handles getting info from providers
 * and abstracts the {@link module:channel/list.ChannelList} complications away.
 * @extends external:EventTarget
 */
export default class ChannelController extends EventTarget {
    /**
     * @fires module:channel/controller.ChannelController#channelsadded
     * @fires module:channel/controller.ChannelController#channeldeleted
     * @fires module:channel/controller.ChannelController#channelupdated
     */
    constructor() {
        super();

        const managerError = (e, name, type, itemType, canceled = () => false) => {
                console.error("loading", itemType, ":", name, type, "an error occured");
                console.error(e);
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
        this._manager = new ChannelsManager();
        this._manager.addEventListener("addchannel", ({ detail: [ name, type, canceled ] }) => this.addChannel(name, type, canceled)
            .then(() => this._manager._deleteCancelingValue("channel", type, name),
                (e) => managerError(e, name, type, "channel", canceled)));
        this._manager.addEventListener("removechannel", ({ detail }) => this.removeChannel(detail));
        this._manager.addEventListener("updatechannel", ({ detail }) => this.updateChannel(detail)
            .catch(managerDoneLoading));
        this._manager.addEventListener("adduser", ({ detail: [ username, type, canceled ] }) => this.addUser(username, type, canceled)
            .then(() => this._manager._deleteCancelingValue("user", type, username),
                (e) => managerError(e, username, type, "user", canceled)));
        this._manager.addEventListener("removeuser", ({ detail }) => this.removeUser(...detail));
        this._manager.addEventListener("updatefavorites", ({ detail }) => this.updateUser(detail)
            .catch(managerDoneLoading));
        this._manager.addEventListener("autoadd", () => this.autoAddUsers().catch(managerDoneLoading));
        this._manager.addEventListener("debugdump", () => {
            Promise.all([
                this.getChannelsByType(),
                this.getUsersByType()
            ]).then(([ channels, users ]) => debugDump.create(channels, users))
                .then((dump) => this._manager.copyDump(JSON.stringify(dump, undefined, 2)));
        });
        this._manager.addEventListener("showoptions", () => {
            prefs.open();
        });

        // We only want the afterchannelsdeleted event to fire after all channels are gone.
        const debouncedEvent = debounce(() => emit(this, "afterchannelsdeleted"), 500),
            listError = (e) => {
                let message,
                    actionsListener;
                const actions = [];
                if(e instanceof CantOpenListError) {
                    message = browser.i18n.getMessage("cookies_disabled");
                    actions.push(browser.i18n.getMessage("enable_cookies"));
                    actionsListener = () => browser.tabs.create({ url: ACCEPT_COOKIES_URL });
                }
                else {
                    message = browser.i18n.getMessage("restore_failed");
                    actions.push(browser.i18n.getMessage("restore_action"));
                    actionsListener = () => browser.tabs.create({ url: REFRESH_PROFILE_URL });
                }
                const es = new ErrorState(message, ErrorState.UNRECOVERABLE, actions);
                es.addEventListener("action", actionsListener);
            };
        /**
         * @type module:channel/list.ChannelList
         * @private
         */
        this._list = new ChannelList();
        this._list._ready.catch(listError);
        this._list.addEventListener("channelsadded", ({ detail: channels }) => {
            channels.forEach((chan) => this._manager.onChannelAdded(chan));

            emit(this, "channelsadded", channels);
        });
        this._list.addEventListener("useradded", ({ detail: user }) => {
            this._manager.onUserAdded(user);
        });
        pipe(this._list, "beforechanneldeleted", this);
        this._list.addEventListener("channeldeleted", ({ detail: channel }) => {
            this._manager.onChannelRemoved(channel.id);

            emit(this, "channeldeleted", channel.id);
            debouncedEvent();
        });
        this._list.addEventListener("channelupdated", ({ detail: channel }) => {
            this._manager.onChannelUpdated(channel);

            emit(this, "channelupdated", channel);
        });
        this._list.addEventListener("userupdated", ({ detail }) => {
            this._manager.onUserUpdated(detail);
        });
        this._list.addEventListener("userdeleted", ({ detail: user }) => {
            this._manager.onUserRemoved(user.id);
        });
        this._list.addEventListener("clear", ({ detail: hard }) => {
            if(hard) {
                const es = new ErrorState(browser.i18n.getMessage("lost_channels"), ErrorState.RECOVERABLE, [
                    browser.i18n.getMessage("manageChannels_label")
                ]);
                es.addEventListener("action", async () => {
                    await this.showManager();
                    es.resolve();
                }, {
                    once: true,
                    passive: true,
                    capture: false
                });
            }
        });
        // Provider update events

        /**
         * @type module:providers/events.EventSink
         * @private
         */
        this._eventSink = new EventSink();
        this._eventSink.addEventListener("updateduser", ({ detail }) => {
            this._list.setUser(detail);
        });
        this._eventSink.addEventListener("newchannels", async ({ detail: channels }) => {
            channels = await formatChannels(filterInapropriateChannels(channels));
            if(channels.length > 0) {
                this._list.addChannels(channels);
            }
        });
        this._eventSink.addEventListener("updatedchannels", ({ detail: channels }) => {
            if(Array.isArray(channels)) {
                formatChannels(channels).then((formattedChannels) => {
                    formattedChannels.forEach((channel) => this._list.setChannel(channel).catch(() => console.warn("Updated a removed channel", channel.login)));
                });
            }
            else {
                this._formatChannel(channels)
                    .then((ch) => this._list.setChannel(ch))
                    .catch(() => console.warn("Updated a removed channel", channels.login));
            }
        });
    }
    /**
     * @inheritdoc {module:channel/utils.formatChannel}
     */
    async _formatChannel(channel) {
        return formatChannel(channel);
    }
    /**
     * Get the details of a channel and store them in the ChannelList.
     *
     * @param {string} name - Username of the channel to add.
     * @param {string} type - Type/provider of the channel to add.
     * @param {Funtion} [canceled=() => false] - Canceling checker.
     * @returns {module:channel/core.Channel} Resulting channel object.
     * @throws If the provider is disabled.
     * @throws If parental controls are enabled and the channel is marked mature.
     * @throws If the action is canceled.
     */
    async addChannel(name, type, canceled = () => false) {
        if(type in providers && providers[type].enabled) {
            const channel = await providers[type].getChannelDetails(name);
            if(ParentalControls.enabled && channel.mature) {
                throw new Error("Not allowed to add this channel");
            }

            const formattedChannel = await this._formatChannel(channel);

            if(canceled()) {
                throw new Error("Canceled");
            }

            return this._list.addChannel(formattedChannel);
        }
        else {
            throw "Provider is disabled";
        }
    }
    /**
     * Update a channel and store it in the ChannelList.
     *
     * @param {number} channelId - ID of the channel to update.
     * @returns {module:channel/core.Channel?} Updated channel object. May be
     *          null if the provider is disabled.
     */
    async updateChannel(channelId) {
        let channel = await this._list.getChannel(channelId);
        if(!providers[channel.type].enabled) {
            return null;
        }

        channel = await providers[channel.type].updateChannel(channel.login);
        channel = await this._formatChannel(channel);
        return this._list.setChannel(channel);
    }
    /**
     * Update channels by provider. Doesn't update if the provider is disabled.
     *
     * @param {string} [provider=null] - Type of channels to update. All
     *                                   channels are updated if left out.
     * @returns {Array.<module:channel/core.Channel>|module:channel/core.Channel}
     *          List of updated channel objects, if multiple were updated, else
     *          object of the updated channel.
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
            let channels = await this._list.getChannelsByType(provider);

            if(channels.length) {
                channels = await providers[provider].updateChannels(channels);
            }

            if(Array.isArray(channels)) {
                const formattedChannels = await formatChannels(channels);
                return Promise.all(formattedChannels.map((c) => {
                    return this._list.setChannel(c);
                }));
            }
            else {
                channels = await this._formatChannel(channels);
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
     * @returns {module:channel/core.Channel} Channel instance.
     * @async
     */
    getChannel(channelId) {
        return this._list.getChannel(channelId);
    }
    /**
     * Get multiple channels by provider.
     *
     * @param {string} [provider=null] - Type of the channels to return. If
     *                                      left out, all channels are returned.
     * @returns {Array.<module:channel/core.Channel>} List of channels with for
     *          the given type/provider.
     * @async
     */
    getChannelsByType(provider = null) {
        return this._list.getChannelsByType(provider);
    }
    /**
     * Remove a channel from the ChannelList.
     *
     * @param {number} channelId - Id of the channel to remove.
     * @returns {module:channel/core.Channel} Removed channel.
     * @async
     */
    removeChannel(channelId) {
        return this._list.removeChannel(channelId);
    }
    /**
     * Add a user and its favorites.
     *
     * @param {string} username - Username of the user to add.
     * @param {string} type - Type/provider of the user to add.
     * @param {Function} [canceled=() => false] - Canceling checker.
     * @returns {module:channel/core.User} An array with the added user and an array of added
     *          channels.
     * @throws Gets rejected if the provider doesn't support favorites.
     * @throws When the action is canceled.
     */
    async addUser(username, type, canceled = () => false) {
        if(type in providers && providers[type].supports.favorites) {
            let [ user, channels ] = await providers[type].getUserFavorites(username);

            if(canceled()) {
                throw "Canceled";
            }

            channels = await formatChannels(filterInapropriateChannels(channels));

            const [ u ] = await Promise.all([
                this._list.addUser(user),
                this._list.addChannels(channels)
            ]);
            return u;
        }
        else {
            throw new Error("Can't add users for provider " + type);
        }
    }
    /**
     * @private
     * @param {module:channel/core.User} user - User instance to update.
     * @async
     * @returns {module:channel/core.User} Updated user.
     */
    async _updateUser(user) {
        const [ updatedUser, channels ] = await providers[user.type].getUserFavorites(user.login),
            filteredChannels = await formatChannels(filterInapropriateChannels(filterExistingFavs(user, channels))),
            [ finalUser ] = await Promise.all([
                this._list.setUser(updatedUser),
                // Can't just call this.addUser(user.login, user.type) because of this.
                this._list.addChannels(filteredChannels)
            ]);
        return finalUser;
    }
    /**
     * Update a user or all users and add any new favorites.
     *
     * @param {number} [userId] - ID of the user, if not specified updates
     *                            all users.
     * @returns {Array.<module:channel/core.User>} Updated user instances.
     */
    async updateUser(userId) {
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
     *                                        omitted all users are returned.
     * @returns {Array.<module:channel/core.User>} User instances for the given
     *          type/provider.
     * @async
     */
    getUsersByType(provider = null) {
        return this._list.getUsersByType(provider);
    }
    /**
     * Remove a user from the ChannelList and optionally remove the channels it
     * favorited.
     *
     * @param {number} userId - ID of the user to remove.
     * @param {boolean} [removeFavorites=false] - Also remove favorited channels
     *        of the user.
     * @returns {module:channel/core.User} Removed user instance.
     */
    async removeUser(userId, removeFavorites = false) {
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
     * @param {string} provider - Provider/type to add credentials for.
     * @param {Array} credentials - Resulting credentials from a search.
     * @returns {Array.<module:channel/core.User>} Added user instances.
     */
    _addFoundCredentials(provider, credentials) {
        return Promise.all(credentials.filter((credential) => credential.username).map((credential) => {
            return this.addUser(credential.username, provider);
        }));
    }
    /**
     * @private
     * @async
     * @param {string} provider - Provider to search for users.
     * @param {string} url - URL to search for credentials for.
     * @returns {Array.<module:channel/core.User>} Users found for the given url.
     */
    _findUsersByURL(provider, url) {
        return logins.search({ url })
            .then(this._addFoundCredentials.bind(this, provider));
    }
    /**
     * Add users that have stored credentials.
     *
     * @param {string} [provider] - Provider to add users stored in the
     * credentials for. If not provided, all providers are searched.
     * @returns {Array.<module:channel/core.User>} Users added based on saved
     *          credentials.
     * @throws If the provider does not support adding users based on credentials.
     * @async
     */
    autoAddUsers(provider) {
        if(!provider || !(provider in providers)) {
            return Promise.all(Object.keys(providers)
                .filter((p) => providers[p].supports.credentials)
                .map(this.autoAddUsers.bind(this)));
        }
        else if(providers[provider].supports.credentials) {
            return Promise.all(providers[provider].authURL.map(this._findUsersByURL.bind(this, provider)))
                .then(flatten);
        }
        else {
            return Promise.reject(new Error(`Provider ${provider} does not support auto adding users`));
        }
    }
    /**
     * Opens or focueses a tab with the manager.
     *
     * @returns {undefined}
     * @async
     */
    showManager() {
        return this._manager.open();
    }

    /**
     * Set the theme of the channel manager.
     *
     * @param {number} theme - Theme ID to use.
     * @returns {undefined}
     */
    setTheme(theme) {
        this._manager.setTheme(theme);
    }

    /**
     * Get a channel object detached from the channel list.
     *
     * @param {string} login - Login of the channel.
     * @param {string} type - Provider of the channel.
     * @returns {module:channel/core.Channel} Channel object for the
     *          requested channel.
     * @throws {Error} when the specified type is not known.
     */
    async getExternalChannel(login, type) {
        if(!(type in providers)) {
            throw new Error("Specified type is not known");
        }
        return providers[type].updateChannel(login);
    }
}
