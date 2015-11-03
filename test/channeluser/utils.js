/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";

let { Channel, User } = require('../../lib/channeluser');

exports.getUser = () => {
    var user = new User();
    user.type = "test";
    user.uname = 'lorem ipsum';
    user.login = 'test';
    user.image = {'20':'http://foo.bar/0.jpg','40':'http://foo.bar/1.jpg'};
    return user;
};

exports.getChannel = () => {
    var channel = new Channel();
    channel.type = "test";
    channel.url.push('http://www.foo.bar/lorem');
    channel.archiveUrl = 'http://www.foo.bar/lorem/archive';
    channel.chatUrl = 'http://www.foo.bar/lorem/chat';
    channel.uname = 'lorem ipsum';
    channel.login = 'test';
    channel.logo = {'20':'http://foo.bar/0.jpg','40':'http://foo.bar/1.jpg'};
    return channel;
};

exports.Channel = Channel;
