/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
 
"use strict";
 
var config = require('./config');
// this is secret
var oauthKey = config.getPreference("justintv.apiKey");
var { Request } = require('sdk/request');
var baseProvider = require('./baseprovider');

exports.archiveURL = "%u/videos?kind=past_broadcasts";
exports.authURL =  "http://wwww.justin.tv";
var requestID = -1;

var baseURL = 'https://api.justin.tv/api';
var type = "justintv";

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
            // the ratelimit gets ignored, if the IP it has been returned for is in the justin.tv subnet.
            // I decided to do so, since they have API issues, where the response would be for a certain
            // server of them and not for the client. This basically broke the whole extension.
            var r = !config.getPreference('justintv.ignoreRatelimit')&&json.hasOwnProperty("rate_limited")&&json.rate_limited&&!json.message.match(/^199\.9\.2(4[89]?|5[1-5]?)?\.[0-2][1-5]?[1-9]?/);
            if(!e&&!r) {
                console.log("request ok");
                return 1;
            }
            // ignore not fatal API errors
            else if((e&&json.error!="couldn't find user"&&json.error!="couldn't find channel")||r) {
                console.log("No fatal error: "+(e?json.error:json.message)+". Retrying");
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

function getRequestObject(channel,completeFunction,ignoreNull,callback) {
    return {
        url: baseURL+'/application/rate_limit_status.json',
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function (response) {
            console.log("ratelimit got");
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

exports.getStatusRequest = function(channel,ignoreNull,callback) {
    return getRequestObject(channel,function(achannel,aignoreNull,acallback) {
        var liveStatusRequest = Request({
            url: baseURL+'/stream/list.json?channel='+achannel,
            headers: {'Authorization':'Bearer '+oauthKey},
            onComplete: function (response) {
                console.log("channel updated");
                var s = exports.checkResponse(response);
                var json = response.json;
                var l = s==1&&json.length>0;
                acallback(s,l,extractChannelsFromList(json),type,aignoreNull);
            }
        });
        console.log("updating channel");
        liveStatusRequest.get();
    }, ignoreNull, callback);
};

exports.getBasicUniChannelInfo = function(channelRspObj) {
    var uniC = baseProvider.channelInfo();
    if(typeof channelRspObj === 'object') {
        uniC.url = channelRspObj.channel_url;
        uniC.name = channelRspObj.title;
        uniC.login = channelRspObj.login;
        uniC.panelAvatar = channelRspObj.image_url_tiny;
        uniC.notificationAvatar = channelRspObj.image_url_medium;
        
        uniC.login = channelRspObj.login
    }
    else if(channelRspObj) {
        uniC.login = channelRspObj;
    }
    
    return uniC;
};

// tie channel object response into an unified channel object
exports.getUnifiedChannelInfo = function(channelRspObj) {
    var uniC = this.getBasicUniChannelInfo(channelRspObj);

    uniC.backgroundColor = channelRspObj.channel_background_color;
    uniC.textColor = channelRspObj.channel_text_color;
    uniC.linkColor = channelRspObj.channel_link_color;
    uniC.bgImage = channelRspObj[config.getPreference("justintv.backgroundImageName")];
    uniC.full = true;
    
    return uniC;
};

// gets the favorites of a user (specified in soruce.name)
exports.getUserFavorites = function(source,ignoreNull,callback) {
    return getRequestObject(source,function(asource,aignoreNull,acallback) {
        var favoritesRequest = Request({
            url: baseURL+'/user/favorites/'+asource.name+'.json?limit=100&offset='+asource.page*100,
            headers: {'Authorization':'Bearer '+oauthKey},
            onComplete: function(response) {
                console.log("user favorites got");
                acallback(exports.checkResponse(response),extractChannelsFromList(response.json),asource,aignoreNull);
            }
        });
        console.log("getting user favorites");
        favoritesRequest.get();
    }, ignoreNull, callback);
};

// fetches the API channel object for a specified channel (source.name)
exports.getChannelDetails = function(source,ignoreNull,callback) {
    return getRequestObject(source,function(asource,aignoreNull,acallback) {
        var detailsRequest = Request({
            url: baseURL+'/channel/show/'+asource.name+'.json',
            headers: {'Authorization':'Bearer '+oauthKey},
            onComplete: function (response) {
                console.log(asource.name+" channel details got");
                acallback(exports.checkResponse(response),exports.getUnifiedChannelInfo(response.json),asource,aignoreNull);
            }
        });
        console.log("getting channel details");
        detailsRequest.get();
    }, ignoreNull, callback);
};

// this parses a favorites request and adds the channels
function extractChannelsFromList(response) {
    if(response.length>0) {
        var channelNames = [];
        response.forEach(function(channel) {
            channelNames.push(exports.getBasicUniChannelInfo(channel));
        });
        return channelNames;
    }
};
