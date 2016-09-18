/**
 * @author Martin Giger
 * @license MPL-2.0
 */

"use strict";

const requireHelper = require("../require_helper"),
    { Channel, User } = requireHelper('../lib/channel/core'),
    self = require("sdk/self"),
    TYPE = "test";

/**
 * Get a test user with username and image set.
 *
 * @param {string} [login='test'] - Login of the user.
 * @param {string} [type='test'] - Provider name for the user.
 * @returns {module:channel/core.User} A user with the given attributes plus a
 *          generic polyfill dataset.
 */
exports.getUser = (login = 'test', type = TYPE) => {
    const user = new User(login, type);
    user.uname = 'lorem ipsum';
    user.image = { '18': self.data.url('icon18.png'), 64: self.data.url('icon64.png') };
    return user;
};

/**
 * Get a test user with valid URL properties, username, image and title.
 *
 * @param {string} [login='test'] - Username for the channel.
 * @param {string} [type='test'] - Provider name for the channel.
 * @param {number?} [id=null] - ID for the channel if it is known.
 * @returns {module:channel/core.Channel} A channel with the given attributes
 *          plus generic polyfills for the other attributes.
 */
exports.getChannel = (login = 'test', type = TYPE, id = null) => {
    const channel = new Channel(login, type, id);
    channel.url.push(self.data.url('list.html'));
    channel.archiveUrl = self.data.url('list.html#archive');
    channel.chatUrl = self.data.url('list.html#chat');
    channel.uname = 'lorem ipsum';
    channel.image = { '18': self.data.url('icon18.png'), 64: self.data.url('icon64.png') };
    channel.title = "Lorem Ipsum, dolor sit amet";
    return channel;
};

/**
 * @type {module:channel/core.Channel}
 */
exports.Channel = Channel;
