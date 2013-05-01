/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
 
 "use strict";
 
// this is secret
var oauthKey = 'nUiO8uME4MWnjNp9qhmpw';
var { randomDelayNumber } = require("./utils");
var { Request } = require('sdk/request');

exports.archiveURL = "%u/videos?kind=past_broadcasts";

function checkResponse(response) {
    // check if we even got a response
    if(response!=null) {
        // check if we got any content
        if(response.status==200) {
            var json = response.json;
            // check if we encountered an API error
            var e = json.hasOwnProperty("error");
            // the ratelimit gets ignored, if the IP it has been returned for is in the justin.tv subnet.
            // I decided to do so, since they have API issues, where the response would be for a certain
            // server of them and not for the client. This basically broke the whole extesnion.
            var r = json.hasOwnProperty("rate_limited")&&!json.message.match(/^199\.9\.2(4[89]?|5[1-5]?)?\.[0-2][1-5]?[1-9]?/);
            if(!e&&(!r||!json.rate_limited)) {
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

exports.getRequestObject = function(channel,completeFunction,ignoreNull,callback) {
    return {
        url: 'https://api.justin.tv/api/application/rate_limit_status.json',
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function (response) {
            console.log("ratelimit got");
            var r = checkResponse(response);
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
        url: 'https://api.justin.tv/api/stream/list.json?channel='+channel,
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function (response) {
            console.log("channel updated");
            callback(checkResponse(response),response.json,channel,ignoreNull)
        }
    });
    console.log("updating channel");
    liveStatusRequest.get();
};

// gets the favorites of a user (specified in soruce.name)
exports.getUserFavorites = function(source,ignoreNull,callback) {
    var favoritesRequest = Request({
        url: 'https://api.justin.tv/api/user/favorites/'+source.name+'.json?limit=100&offset='+source.page*100,
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function(response) {
            console.log("user favorites got");
            callback(checkResponse(response),response.json,source,ignoreNull,extractChannelsFromFavorites(source,response.json));
        }
    });
    console.log("getting user favorites");
    favoritesRequest.get();
};

// fetches the API channel object for a specified channel (source.name)
exports.getChannelDetails = function(source,ignoreNull,callback) {
    var detailsRequest = Request({
        url: 'https://api.justin.tv/api/channel/show/'+source.name+'.json',
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function (response) {
            console.log(source.name+" channel details got");
            callback(checkResponse(response),response.json,source,ignoreNull);
        }
    });
    console.log("getting channel details");
    detailsRequest.get();    
};

// this parses a favorites request and adds the channels
function extractChannelsFromFavorites(source,response) {
    if(response.length>0) {
        var channelNames = [];
        response.forEach(function(channel) {
            channelNames.push(channel);
        });
        return channelNames
    }
};
