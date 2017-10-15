/**
 * Channel list Object.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/list
 * @requires module:channel/core
 */
import ReadChannelList from '../../read-channel-list';
import { Channel, User } from "./core";

/**
 * @class module:channel/list.DeserializedReadChannelList
 * @extends module:read-channel-list.ReadChannelList
 */
export default class DeserializedReadChannelList extends ReadChannelList {
    /**
     * Get the specified channel.
     *
     * @param {(number|string)} id - ID of login of the channel.
     * @param {string} [type] - Type of the channel if a login was passed as
     *                             first argument.
     * @returns {module:channel/core.Channel} Requested channel instance.
     * @throws The channel doesn't exist or no arguments passed.
     */
    async getChannel(id, type) {
        const channel = await super.getChannel(id, type);
        return Channel.deserialize(channel);
    }

    /**
     * Get the specified user.
     *
     * @param {(number|string)} id - ID of login of the user.
     * @param {string} [type] - Type of the user if a login was passed as first
     *                             argument.
     * @returns {module:channel/core.User} Requested user instance.
     * @throws The user doesn't exist or no arguments passed.
     */
    async getUser(id, type) {
        const user = await super.getUser(id, type);
        return User.deserialize(user);
    }

    /**
     * Get all channels with the specified type.
     *
     * @param {string} [type] - Type all the channels should have. If left out,
     *                             all channels are returned.
     * @returns {[module:channel/core.Channel]} Array of all channels for
     *          the given type. May be empty.
     */
    async getChannelsByType(type) {
        const channels = await super.getChannelsByType(type);
        return channels.map((ch) => Channel.deserialize(ch));
    }

    /**
     * Get all users in the ChannelList with a certain type.
     *
     * @param {string} [type] - The type all returned users should have. If left
     *                             out all users are returned.
     * @returns {[module:channel/core.User]} Array of users for the given
     *          type. May be empty.
     */
    async getUsersByType(type) {
        const users = await super.getUsersByType(type);
        return users.map((u) => User.deserialize(u));
    }

    /**
     * Get the live status of the ChannelList as a whole.
     *
     * @param {string} [type] - Check the live state of just the channels of the
     *                             specified type.
     * @todo make live an index and then get all the channels that are live and
     *       count those. That should be slightly faster than this O(n)
     *       operation on the array of all channels.
     * @returns {boolean} Resolves to a boolean indicating, if there are any live
     *                   channels.
     */
    async liveStatus(type) {
        const channels = await this.getChannelsByType(type);
        for(const channel of channels) {
            if(await channel.live.isLive()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get all users that have the given channel as a favorite.
     *
     * @param {module:channel/core.Channel} channel - Channel to search users's
     *                                                  favorites for.
     * @returns {[module:channel/core.User]} List of users that follow the
     *          given channel.
     */
    async getUsersByFavorite(channel) {
        const users = await super.getUsersByFavorite(channel);
        return users.map((u) => User.deserialize(u));
    }

    /**
     * Get all channels that are favorited by a user.
     *
     * @param {module:channel/core.User} user - User to get the favorites of.
     * @returns {[module:channel/core.Channel]} List of channels a user
     *          follows.
     */
    async getChannelsByUserFavorites(user) {
        const channels = await super.getChannelsByUserFavorites(user);
        return channels.map((ch) => Channel.deserialize(ch));
    }
}
