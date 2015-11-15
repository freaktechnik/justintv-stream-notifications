/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";

const requireHelper = require("../require_helper");
let { Channel, User } = requireHelper('../lib/channel/core');

const TYPE = "test";

exports.getUser = (login = 'test', type = TYPE) => {
    var user = new User(login, type);
    user.uname = 'lorem ipsum';
    user.image = {'20':'http://foo.bar/0.jpg','40':'http://foo.bar/1.jpg'};
    return user;
};

exports.getChannel = (login = 'test', type = TYPE) => {
    var channel = new Channel(login, type);
    channel.url.push('http://www.foo.bar/lorem');
    channel.archiveUrl = 'http://www.foo.bar/lorem/archive';
    channel.chatUrl = 'http://www.foo.bar/lorem/chat';
    channel.uname = 'lorem ipsum';
    channel.logo = {'20':'http://foo.bar/0.jpg','40':'http://foo.bar/1.jpg'};
    channel.title="Lorem Ipsum, dolor sit amet";
    return channel;
};

exports.Channel = Channel;
