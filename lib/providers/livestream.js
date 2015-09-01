/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

//TODO implement favorites stuff

"use strict";
const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
let { all } = require("sdk/core/promise");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");

const { Channel } = require('../channeluser');
const { GenericProvider } = require("./generic-provider");

var type = "livestream",
    archiveURL = "/videos",
    headers = {},
    baseURL = ".api.channel.livestream.com/2.0/";

function requeue(data) {
    return data.status > 499;
}

function getChannelAPIUrl(channellogin) {
    return "http://x"+channellogin.replace("_","-","g")+"x"+baseURL;
}

const Livestream = newClass({
    extends: GenericProvider,
    authURL: ["http://new.livestream.com"],
    getChannelDetails: async(function*(username) {
        var ch = new Channel();
        ch.type = this._type;
        ch.login = username.toLowerCase();

        let [ data, response ] = yield all([
            this._qs.queueRequest(getChannelAPIUrl(ch.login)+"info.json", headers, requeue),
            this._qs.queueRequest(getChannelAPIUrl(ch.login)+"latestclips.json?maxresults=1", headers, requeue)
        ]);

        if(data.json && data.json.channel) {
            console.info("Creating livestream channel");
            ch.uname = data.json.channel.title;
            ch.title = "";
            ch.url.push(data.json.channel.link);
            ch.image = { "100": data.json.channel.image.url };
            ch.category = data.json.channel.category;
            ch.live = data.json.channel.isLive;
            ch.viewers = data.json.channel.currentViewerCount;
            ch.archiveUrl = data.json.channel.link;
            ch.chatUrl = data.json.channel.link+"/chat";

            if(response.json && response.json.channel.item && response.json.channel.item.length > 0) {
                ch.thumbnail = response.json.channel.item[0].thumbnail["@url"];
            }

            return ch;
        }
        else {
            throw "Error getting details for the Livestream channel " + username;
        }
    }),
    updateRequest: function(channels) {
        var urls = channels.map((channel) => { return getChannelAPIUrl(channel.login)+"livestatus.json"; });
        this._qs.queueUpdateRequest(urls, headers, this._qs.HIGH_PRIORITY, requeue, (data, url) => {
            if(data.json && data.json.channel) {
                var requestLogin = url.match(/http:\/\/x([a-zA-Z0-9-]+)x\./)[1].replace("-","_"),
                    channel = channels.find((channel) => { return requestLogin == channel.login;});
                channel.live = data.json.channel.isLive;
                channel.viewers = data.json.channel.currentViewerCount;
                this._qs.queueRequest(getChannelAPIUrl(channel.login)+"latestclips.json?maxresults=1", headers, requeue).then((data) => {
                    if(data.json && "channel" in data.json && data.json.channel.item.length) {
                        channel.thumbnail = data.json.channel.item[0].thumbnail["@url"];
                    }
                    emit(this, "updatedchannels", channel);
                });
            }
        });
    }
});

module.exports = new Livestream(type);

