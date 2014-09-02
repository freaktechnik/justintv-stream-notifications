/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
 
"use strict";
 
var config = require('./config');
var clientId = config.getPreference("twitch.clientId");
var baseProvider = require('./baseprovider');

exports.archiveURL = "%u/profile/pastBroadcasts";
exports.authURL = "http://www.twitch.tv";
var requestID = -1;

var baseURL = 'https://api.twitch.tv/kraken';
var header = {'Client-ID':clientId, 'Accept':'application/vnd.twitchtv.v2+json'};
var type = "twitch";

exports.setRequestID = function(id) {
    requestID = id;
};
exports.getRequestID = function() {
    return requestID;
};

exports.checkResponse = function(response) {
    // check if we even got a response
    if(response!=null) {
        // check if we got any content
        if(response.status==200) {
            var json = response.json;
            // check if we encountered an API error
            var e = json.hasOwnProperty("error");
            if(!e) {
                console.log("request ok");
                return 1;
            }
            // ignore not fatal API errors
            else if(e) {
                console.log("No fatal error: "+(json.message)+". Retrying");
                return 2;
            }
            console.log("Request failed");
            return 0;
        }
        // check the response error
        else if((response.status<400||response.status>=500)&&response.status!=0) {
            console.log("Status code OK, retrying: "+response.status);
            return 2;
        }
        console.log("Request failed: "+response.status);
        return 0;
    }
    // if it was empty, retry.
    console.log("Empty response. Retrying");
    return 2;
};

exports.getStatusRequest = function(channel,ignoreNull,callback) {
    return {
        url: baseURL+'/streams?channel='+channel,
        headers: header,
        onComplete: function (response) {
            console.log("channel updated");
            var s = exports.checkResponse(response);
            var json = response.json.streams;
            var l = s==1&&json.length>0;
            console.log(channel+' is live: '+l);
            callback(s,l,extractChannelsFromList(json),type,ignoreNull);
        }
    };
};

exports.getBasicUniChannelInfo = function(channelRspObj) {
    var uniC = baseProvider.channelInfo();
    if(typeof channelRspObj === 'object') {
        uniC.url = channelRspObj.url;
        uniC.name = channelRspObj.display_name;
        if(channelRspObj.logo) {
            uniC.panelAvatar = channelRspObj.logo;
            uniC.notificationAvatar = channelRspObj.logo;
        }
        else {
            uniC.panelAvatar = "http://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png";
            uniC.notificationAvatar = "http://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png";
        }
        uniC.title = channelRspObj.status;
        //uniC.live = channelRspObj.live;
        uniC.login = channelRspObj.name;
    }
    else if(channelRspObj) {
        uniC.login = channelRspObj;
    }
    
    return uniC;
};

// tie channel object response into an unified channel object
exports.getUnifiedChannelInfo = function(channelRspObj) {
    var uniC = this.getBasicUniChannelInfo(channelRspObj.channel);

    uniC.backgroundColor = '#FFFFFF';
    uniC.textColor = 'rgb(68, 68, 68)';
    uniC.linkColor = 'rgb(100, 65, 165)';
    uniC.bgImage = channelRspObj.channel[config.getPreference("twitch.backgroundImageName")];
    if(channelRspObj.hasOwnProperty("preview"))
        uniC.thumbnail = channelRspObj.preview;
    else
        uniC.thumbnail = channelRspObj.channel.video_banner;
    uniC.full = true;
    
    return uniC;
};

// gets the favorites of a user (specified in soruce.name)
exports.getUserFavorites = function(source,ignoreNull,callback, channels) {
    return {
        url: baseURL+'/users/'+source.name+'/follows/channels?limit=100&offset='+source.page*100,
        headers: header,
        onComplete: function(response) {
            console.log("user favorites got");
            callback(exports.checkResponse(response),addChannelsToList(channels,extractChannelsFromList(response.json.follows)),source,ignoreNull);
        }
    };
};

// fetches the API channel object for a specified channel (source.name)
exports.getChannelDetails = function(source,ignoreNull,callback) {
    return {
        url: baseURL+'/channels/'+source.name,
        headers: header,
        onComplete: function (response) {
            console.log(source.name+" channel details got");
            callback(exports.checkResponse(response),exports.getUnifiedChannelInfo({'channel':response.json}),source,ignoreNull);
        }
    };    
};

// this parses a favorites request and adds the channels
function extractChannelsFromList(response) {
    if(!!response&&response.length>0) {
        var channelNames = [];
        response.forEach(function(channel) {
            channelNames.push(exports.getUnifiedChannelInfo(channel));
        });
        return channelNames;
    }
}

function addChannelsToList(channels, list) {
    if(channels) {
        channels.forEach(function(channel) {
            list.push(channel);
        });
    }
    return list;
}
