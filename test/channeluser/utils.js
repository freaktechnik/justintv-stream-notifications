/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";

const requireHelper = require("../require_helper");
let { Channel, User } = requireHelper('../lib/channel/core');
const self = require("sdk/self");

const TYPE = "test";

exports.getUser = (login = 'test', type = TYPE) => {
    var user = new User(login, type);
    user.uname = 'lorem ipsum';
    user.image = {'18': self.data.url('icon18.png'), 64: self.data.url('icon64.png')};
    return user;
};

exports.getChannel = (login = 'test', type = TYPE, id = null) => {
    var channel = new Channel(login, type, id);
    channel.url.push(self.data.url('panel.html'));
    channel.archiveUrl = self.data.url('panel.html#archive');
    channel.chatUrl = self.data.url('panel.html#chat');
    channel.uname = 'lorem ipsum';
    channel.image = {'18': self.data.url('icon18.png'), 64: self.data.url('icon64.png')};
    channel.title="Lorem Ipsum, dolor sit amet";
    return channel;
};

exports.Channel = Channel;
