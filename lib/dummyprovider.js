/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
 
"use strict";

var baseProvider = require('./baseprovider');

exports.archiveURL = "";
var type = "";

exports.checkResponse = function(response) {
    // ok
    return 1;
    // retry
    return 2;
    // abort
    return 0;
};

exports.getStatusRequest = function(channel,ignoreNull,callback) {
    return {
        url: baseURL+''+channel,
        onComplete: function (response) {
            callback(exports.checkResponse(response),live,exports.getBasicUniChannelInfo(response[channel]),type,ignoreNull);
        }
    };
};

exports.getBasicUniChannelInfo = function(channelRspObj) {
    var uniC = baseProvider.channelInfo();
    if(typeof channelRspObj === 'object') {
        uniC.url = channelRspObj.url;
        uniC.name = channelRspObj.name;
        uniC.panelAvatar = channelRspObj.apnelAvatar;
        uniC.notificationAvatar = channelRspObj.notificationAvatar;
        uniC.title = channelRspObj.title;
    }
    uniC.login = channelRspObj.login;
    
    return uniC;
};

// tie channel object response into an unified channel object
exports.getUnifiedChannelInfo = function(channelRspObj) {
    var uniC = this.getBasicUniChannelInfo(channelRspObj);

    uniC.backgroundColor = ''; // hex plz
    uniC.textColor = '';
    uniC.linkColor = '';
    uniC.bgImage = channelRspObj.bgImage;
    uniC.full = true;
    
    return uniC;
};

// gets the favorites of a user (specified in soruce.name)
exports.getUserFavorites = function(source,ignoreNull,callback) {
    return {
        url: baseURL+''+source.name,
        onComplete: function(response) {
            callback(exports.checkResponse(response),[unifiedChannelArray],source,ignoreNull);
        }
    };
};

// fetches the API channel object for a specified channel (source.name)
exports.getChannelDetails = function(source,ignoreNull,callback) {
    return {
        url: baseURL+''+source.name,
        onComplete: function (response) {
            callback(exports.checkResponse(response),exports.getUnifiedChannelInfo(response[channel]),source,ignoreNull);
        }
    };    
};
