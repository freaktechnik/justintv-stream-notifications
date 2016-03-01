/**
 * @author Martin Giger
 * @license MPL-2.0
 */

"use strict";

const requireHelper = require("../require_helper");
let { Channel, User } = requireHelper('../lib/channel/core');
const self = require("sdk/self");

const TYPE = "test";

/**
 * Get a test user with username and image set.
 * @param {string} [login='test']
 * @param {string} [type='test']
 * @return {module:channel/core.User}
 */
exports.getUser = (login = 'test', type = TYPE) => {
    var user = new User(login, type);
    user.uname = 'lorem ipsum';
    user.image = {'18': self.data.url('icon18.png'), 64: self.data.url('icon64.png')};
    return user;
};

/**
 * Get a test user with valid URL properties, username, image and title.
 * @oaram {string} [login='test']
 * @param {string} [type='test']
 * @param {number?} [id=null]
 * @return {module:channel/core.Channel}
 */
exports.getChannel = (login = 'test', type = TYPE, id = null) => {
    var channel = new Channel(login, type, id);
    channel.url.push(self.data.url('list.html'));
    channel.archiveUrl = self.data.url('list.html#archive');
    channel.chatUrl = self.data.url('list.html#chat');
    channel.uname = 'lorem ipsum';
    channel.image = {'18': self.data.url('icon18.png'), 64: self.data.url('icon64.png')};
    channel.title="Lorem Ipsum, dolor sit amet";
    return channel;
};

/**
 * @type {module:channel/core.Channel}
 */
exports.Channel = Channel;
