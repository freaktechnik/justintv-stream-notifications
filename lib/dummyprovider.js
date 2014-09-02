/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
 
"use strict";

var { Channel, User } = require('./channeluser');

var type = "dummy",
    requests = [],
    archiveURL = "";
exports.authURL = "";
exports.queueRequest = function() {
    throw new Error("Please set a request function for "+type);
};
exports.unqueueRequest = function() {
    throw new Error("Please set a unqueuing function for "+type);
};

exports.checkResponse = function(response) {
    // ok
    return 1;
    // retry
    return 2;
    // abort
    return 0;
};

exports.requeueStatusRequest = function(channels, ignoreNull, callback) {
    requests.forEach(function(req) {
        this.uqueueRequest(req);
    }, this);
    getStatusRequest(channels, ignoreNull, callback);
};

function getStatusRequest(channel,ignoreNull,callback) {
    requests.push(this.queueRequest({
        url: baseURL+''+channel,
        onComplete: function (response) {
            callback(exports.checkResponse(response),live,getChannelInfo(response[channel]),type,ignoreNull);
        }
    }));
}
function getChannelInfo(channelRspObj) {
    var channelProps = {
        login: channelRspObj.login,
        name: channelRspObj.name,
        title: channelRspObj.title,
        viewers: channelRspObj.viewers,
        thumbnail: channelRspObj.thumbnail,
        image: {
            120: channelRspObj.avatar,
            250: channelRspObj.biggerAvatar
        },
        url: [
            channelRspObj.url
        ],
        archiveUrl: archiveURL + channelRspObj.login
    };
    return Object.create(Channel, channelProps);
}

// gets the favorites of a user (specified in soruce.name)
exports.getUserFavorites = function(source,ignoreNull,callback) {
    this.queueRequest({
        url: baseURL+''+source.name,
        onComplete: function(response) {
            callback(exports.checkResponse(response),User(source.name,response.channels),source,ignoreNull);
        }
    });
};

// fetches the API channel object for a specified channel (source.name)
exports.getChannelDetails = function(source,ignoreNull,callback) {
    this.queueRequest({
        url: baseURL+''+source.name,
        onComplete: function (response) {
            callback(exports.checkResponse(response),getChannelInfo(response[channel]),source,ignoreNull);
        }
    });
};
