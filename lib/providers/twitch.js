/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
//TODO pagination
 
"use strict";
var _     = require("sdk/l10n").get;
var prefs = require("sdk/simple-prefs");
var { Channel, User } = require('../channeluser');

var type          = "twitch",
    archiveURL    = "%u/profile/pastBroadcasts",
    clientId      = prefs.twitch_clientId,
    baseURL       = 'https://api.twitch.tv/kraken',
    headers       = {'Client-ID':clientId, 'Accept':'application/vnd.twitchtv.v2+json'},
    defaultAvatar = "http://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png";
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
            else if(e) {
                console.log("No fatal error: "+(json.message)+". Retrying");
                return true;
            }
            console.log("Request failed");
            return false;
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
    ret.archiveUrl = archiveURL.replace(/%u/, jsonChannel.name);
    ret.image      = { 300: jsonChannel.logo?jsonChannel.logo:defaultAvatar};
    ret.type       = type;
    ret.title      = jsonChannel.status;
    return ret;
}

exports.getUserFavorites = function(username, userCallback, channelsCallback) {
    var page = 0;
    qs.queueRequest(baseURL+'/users/'+username+'/follows/channels?limit=100&offset='+page*100, headers, requeue, function(data) {
        var channels = [];
        data.json.follows.forEach(function(channel) {
            channels.push(getChannelFromJSON(channel.channel));
        });
        channelsCallback(channels);
        qs.queueRequest(baseURL+'/users/'+username, headers, requeue, function(data) {
            var user = new User();
            user.login = data.json.name;
            user.uname = data.json.display_name;
            user.image = { 300: data.json.logo?data.json.logo:defaultAvatar };
            user.type  = type;
            user.favorites = channels.reduce(function(prev, curr) { prev.push(curr.login); return prev; }, []);
            userCallback(user);
        });
    });
};
exports.getChannelDetails = function(channelname, callback) {
    qs.queueRequest(baseURL+'/channels/'+channelname, headers, requeue, function(data) {
        console.log(data.json);
        callback(getChannelFromJSON(data.json));
    });
};
exports.updateRequest = function(channels, callback) {
    var channelsString = channels.reduce(function(prev, curr) { return prev+','+curr.login; },"");
    qs.queueUpdateRequest(baseURL+'/sreams?channel='+channelsString, headers, requeue, function(data) {
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

        channels.forEach(function(channel) {
            if(channel.live && !ret.find(function(cho) {
                return cho.login == channel.login;
            })) {
                channel.live = false;
                ret.push(channel);
            }
        });
        callback(ret);
    });
};

