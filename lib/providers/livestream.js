/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
 
"use strict";

var { randomDelayNumber } = require("./utils");
var { Request } = require('sdk/request');
var baseProvider = require('./baseprovider');

exports.archiveURL = "%u/videos?kind=past_broadcasts";
var baseURL = 'https://api.livestream.com';
var type = "livestream";

exports.checkResponse = function(response) {
    return 0;
    return 1;
    return 2;
};

exports.getRequestObject = function(channel,completeFunction,ignoreNull,callback) {
    return {
        url: baseURL+'',
        onComplete: function (response) {
            var r = exports.checkResponse(response);
            if(r==1) {
                console.log("ratelimit response was valid");
                completeFunction(channel,ignoreNull,callback);
            }
            else if(!ignoreNull&&r==2) {
                console.log("refetching ratelimit");
                callback(2,response,channel,ignoreNull);
            }
        }
    };
};

exports.statusRequest = function(channel,ignoreNull,callback) {
    var liveStatusRequest = Request({
        url: baseURL+''+channel,
        onComplete: function (response) {
            console.log("channel updated");
            callback(exports.checkResponse(response),response.json,channel,type,ignoreNull)
        }
    });
    console.log("updating channel");
    liveStatusRequest.get();
};

exports.getBasicUniChannelInfo = function(channelRspObj) {
    var uniC = baseProvider.channelInfo();
    uniC.url = channelRspObj.;
    uniC.name = channelRspObj.;
    uniC.login = channelRspObj.;
    uniC.panelAvatar = channelRspObj.;
    uniC.notificationAvatar = channelRspObj.;
    uniC.title = channelRspObj.;
    uniC.live = channelRspObj.;
    
    return uniC;
};

// tie channel object response into an unified channel object
exports.getUnifiedChannelInfo = function(channelRspObj) {
    var uniC = this.getBasicUniChannelInfo(channelRspObj);

    uniC.backgroundColor = ;
    uniC.textColor = ';
    uniC.linkColor = ;
    uniC.bgImage = channelRspObj;
    
    return uniC;
};

// gets the favorites of a user (specified in soruce.name)
exports.getUserFavorites = function(source,ignoreNull,callback) {
    var favoritesRequest = Request({
        url: baseURL+'',
        onComplete: function(response) {
            console.log("user favorites got");
            callback(exports.checkResponse(response),response.json,source,ignoreNull,extractChannelsFromList(source,response.json));
        }
    });
    console.log("getting user favorites");
    favoritesRequest.get();
};

// fetches the API channel object for a specified channel (source.name)
exports.getChannelDetails = function(source,ignoreNull,callback) {
    var detailsRequest = Request({
        url: baseURL+''+source.name,
        onComplete: function (response) {
            console.log(source.name+" channel details got");
            callback(exports.checkResponse(response),exports.getUnifiedChannelInfo(response.json),source,ignoreNull);
        }
    });
    console.log("getting channel details");
    detailsRequest.get();    
};

// this parses a favorites request and adds the channels
function extractChannelsFromList(source,response) {
    if(response.length>0) {
        var channelNames = [];
        response.forEach(function(channel) {
            channelNames.push(exports.getUnifiedChannelInfo(channel));
        });
        return channelNames;
    }
};
