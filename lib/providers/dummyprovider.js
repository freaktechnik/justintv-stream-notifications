/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
 
"use strict";

var { Channel, User } = require('./channeluser');

var type = "dummy",
    requests = [],
    archiveURL = "http://example.com/%u/archive";
exports.name         = "Dummy Provider";
exports.toString     = () => { this.name };
exports.authURL      = "https://example.com";
exports.queueRequest = function() {
    throw new Error("Please set a request function for "+type);
};
exports.unqueueRequest = function() {
    throw new Error("Please set a unqueuing function for "+type);
};

exports.requeueStatusRequest = function(channels, callback) {
    requests.forEach(function(req) {
        this.uqueueRequest(req);
    }, this);
    getStatusRequest(channels, ignoreNull, callback);
};

function getStatusRequest(channel, callback) {
    requests.push(this.queueRequest({
        url: baseURL+''+channel,
        onComplete: function (response) {
            if(checkResponse(response)
                callback(response);
        }
    }));
}
function getChannelInfo(channelRspObj) {
    var channelProps = {
        login: channelRspObj.login,
        name: channelRspObj.name,
        title: channelRspObj.title,
        viewers: Number.parseInt(channelRspObj.viewers,10),
        thumbnail: channelRspObj.thumbnail,
        image: {
            120: channelRspObj.avatar,
            250: channelRspObj.biggerAvatar
        },
        url: [
            channelRspObj.url
        ],
        archiveUrl: archiveURL.replace("%u",channelRspObj.login)
    };
    return Object.assign(new Channel(), channelProps);
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
exports.getChannelDetails = function(name, callback) {
    this.queueRequest({
        url: baseURL+''+name,
        onComplete: function (response) {
            callback(exports.checkResponse(response),getChannelInfo(response[channel]),source,ignoreNull);
        }
    });
};
