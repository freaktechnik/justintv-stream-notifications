/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
 
"use strict";
var _     = require("sdk/l10n").get;
var prefs = require("sdk/simple-prefs");
var { Channel, User }    = require('../channeluser'),
    { PaginationHelper } = require('../pagination-helper');

var type          = "twitch",
    archiveURL    = "/profile/pastBroadcasts",
    clientId      = prefs.twitch_clientId,
    baseURL       = 'https://api.twitch.tv/kraken',
    headers       = {'Client-ID':clientId, 'Accept':'application/vnd.twitchtv.v2+json'},
    defaultAvatar = "http://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png",
    itemsPerPage  = 100;
exports.name       = _("provider_twitch");
exports.toString   = () => { this.name };
exports.authURL    = "http://www.twitch.tv";

var qs = require("../queueservice").getServiceForProvider(type);

function requeue(response) {
    // check if we even got a response
    if(response!=null) {
        // check if we got any content
        if(response.status==200) {
            var json = response.json;
            // check if we encountered an API error
            var e = json.hasOwnProperty("error");
            if(!e) {
                console.log("request ok");
                return false;
            }
            // ignore not fatal API errors
            else {
                console.log("No fatal error: "+(json.message)+". Retrying");
                return true;
            }
        }
        // check the response error
        else if((response.status<400||response.status>=500)&&response.status!=0) {
            console.log("Status code OK, retrying: "+response.status);
            return true;
        }
        console.log("Request failed: "+response.status);
        return false;
    }
    // if it was empty, retry.
    console.log("Empty response. Retrying");
    return true;
}

function getChannelFromJSON(jsonChannel) {
    var ret        = new Channel();
    ret.login      = jsonChannel.name;
    ret.uname      = jsonChannel.display_name;
    ret.url.push(jsonChannel.url);
    ret.archiveUrl = jsonChannel.url + archiveURL;
    ret.image      = { "300": jsonChannel.logo?jsonChannel.logo:defaultAvatar};
    ret.type       = type;
    ret.title      = jsonChannel.status;
    return ret;
}

exports.getUserFavorites = function(username, userCallback, channelsCallback) {
    new PaginationHelper({
        url: baseURL+'/users/'+username+'/follows/channels?limit='+itemsPerPage+'&offset=',
        pageSize: itemsPerPage,
        request: function(url, callback) {
            qs.queueRequest(url, headers, requeue, callback);
        },
        fetchNextPage: function(data) {
            return data.json && data.json.follows && data.json.follows.length == itemsPerPage;
        },
        getItems: function(data) {
            console.log(data.json);
            if(data.json && data.json.follows)
                return data.json.follows;
            else
                return [];
        },
        onComplete: function(jsonChannels) {
            var channels = [];
            jsonChannels.forEach(function(channel) {
                channels.push(getChannelFromJSON(channel.channel));
            });
            channelsCallback(channels);
            qs.queueRequest(baseURL+'/users/'+username, headers, requeue, function(data) {
                if(data.json && !data.json.error) {
                    var user = new User();
                    user.login = data.json.name;
                    user.uname = data.json.display_name;
                    user.image = { 300: data.json.logo?data.json.logo:defaultAvatar };
                    user.type  = type;
                    user.favorites = channels.reduce(function(prev, curr) { prev.push(curr.login); return prev; }, []);
                    userCallback(user);
                }
            });
        }
    });
};
exports.getChannelDetails = function(channelname, callback) {
    qs.queueRequest(baseURL+'/channels/'+channelname, headers, requeue, function(data) {
        if(data.json && !data.json.error)
            callback(getChannelFromJSON(data.json));
    });
};
exports.updateRequest = function(channels, callback) {
    var channelsString = channels.reduce(function(prev, curr) { return prev+','+curr.login; },""),
        urls = [];
    for(var i = 0; i*itemsPerPage < channels.length; ++i) {
        urls.push(baseURL+'/streams?channel='+channelsString+'&limit='+itemsPerPage+'&offset='+i*itemsPerPage);
    }
    qs.queueUpdateRequest(urls, headers, requeue, function(data) {
        if(data.json && !data.json.error) {
            var ret = [], cho;
            data.json.streams.forEach(function(obj) {
                cho = getChannelFromJSON(obj.channel);
                cho.viewers   = obj.viewers;
                cho.thumbnail = obj.preview;
                cho.live      = true;
                cho.id        = channels.find(function(ch) {
                                    return cho.login == ch.login;
                                }).id;
            });

            /*TODO fix going offline
            channels.forEach(function(channel) {
                if(channel.live && !ret.find(function(cho) {
                    return cho.login == channel.login;
                })) {
                    channel.live = false;
                    ret.push(channel);
                }
            });*/
            callback(ret);
        }
    });
};

