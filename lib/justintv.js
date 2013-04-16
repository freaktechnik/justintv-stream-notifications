/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
 
// this is secret
var oauthKey = 'nUiO8uME4MWnjNp9qhmpw';
var { randomDelayNumber } = require("./utils");

function checkResponse(response) {
    // check if we even got a response
    if(response!=null) {
        // check if we got any content
        if(response.status==200) {
            var json = response.json;
            // check if we encountered an API error
            var e = json.hasOwnProperty("error");
            var r = json.hasOwnProperty("rate_limited");
            if(!e&&(!r||!json.rate_limited)) {
                console.log("request ok");
                return 1;
            }
            // ignore not fatal API errors
            else if((e&&json.error!="couldn't find user"&&json.error!="couldn't find channel")||r) {
                console.log("No fatal error. Retrying");
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

exports.getRequest = function(channel,completeFunction,ignoreNull,callback) {
    return Request({
        url: 'https://api.justin.tv/api/application/rate_limit_status.json?t='+new Date().getTime(),
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
    });
};

function checkRateLimit(channel,completeFunction,ignoreNull,callback) {
    var rateRequest = this.getRequest(channel,completeFunction,ignoreNull,callback);
    console.log("getting rate limit");
    rateRequest.get();
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
    return Request({
        url: 'https://api.justin.tv/api/channel/show/'+source.name+'.json',
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function (response) {
            console.log("channel details got");
            callback(checkResponse(response),response.json,source,ignoreNull);
        }
    });
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
