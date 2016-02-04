/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";
const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
let { all, reject } = require("sdk/core/promise");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");

const { Channel } = require('../channel/core');
const { GenericProvider } = require("./generic-provider");

var type          = "ustream",
    chatURL       = "http://ustream.tv/socialstream/",
    baseURL       = 'https://api.ustream.tv/';

function getChannelFromJSON(jsonChannel) {
    console.info("ustream:getChannelFromJSON");
    var ret        = new Channel(jsonChannel.id, type);
    ret.uname      = jsonChannel.title;

    // Url stuff. It's pretty fun.
    if("originalUrl" in jsonChannel) {
        ret.url.push(jsonChannel.originalUrl);
        ret.archiveUrl = jsonChannel.originalUrl;
    }
    if("url" in jsonChannel) {
       ret.url.push("http://ustream.tv/channel/"+jsonChannel.url);
       if(!ret.archiveUrl)
           ret.archiveUrl = "http://ustream.tv/channel/"+jsonChannel.url;
    }
    if("tinyurl" in jsonChannel) {
        ret.url.push(jsonChannel.tinyurl);
        if(!ret.archiveUrl)
            ret.archiveUrl = "http://ustream.tv/channel/"+jsonChannel.url;
    }
    ret.chatUrl    = chatURL + jsonChannel.id;

    if("picture" in jsonChannel) {
        ret.image = {};
        let size;
        Object.keys(jsonChannel.picture).forEach((s) => {
            size = s.split("x")[0];
            ret.image[size] = jsonChannel.picture[s];
        });
    }
    else {
        ret.image = { "48": jsonChannel.owner.picture};
    }
    if("tags" in jsonChannel && jsonChannel.tags.length > 0)
        ret.category = jsonChannel.tags[0];
    ret.live       = jsonChannel.status == "live";
    if("thumbnail" in jsonChannel)
        ret.thumbnail = jsonChannel.thumbnail.live;
    if("stats" in jsonChannel)
        ret.viewers = ret.live ? jsonChannel.stats.viewer : jsonChannel.stats.viewer_total;
    return ret;
}

const Ustream = newClass({
    extends: GenericProvider,
    authURL: ["http://ustream.tv"],
    getChannelDetails: async(function*(channelname) {
        let data = yield this._qs.queueRequest("http://ustream.tv/"+channelname);
        let retried = false;

        if(data.status != 200) {
            data = yield this._qs.queueRequest("http://ustream.tv/channel/"+channelname);
            if(data.status != 200) {
                throw "Error getting channel details for channel " + channelname;
            }
            retried = true;
        }

        let channelId = data.text.match(/<meta name="ustream:channel_id" content="([0-9]+)">/)[1];
        let response = yield this._qs.queueRequest(baseURL+"channels/"+channelId+".json");

        if(response.json && "channel" in response.json) {
            let jsonChannel = response.json.channel;

            if(!retried)
                jsonChannel.originalUrl = "http://ustream.tv/"+channelname;

            return getChannelFromJSON(jsonChannel);
        }
        else {
            throw "Error getting channel details for channel " + channelname;
        }
    }),
    updateRequest: function(channels) {
        var urls = channels.map(function(channel) { return baseURL+"channels/"+channel.login+".json"; });
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data) => {
            if(data.json && data.json.channel) {
                emit(this, "updatedchannels", getChannelFromJSON(data.json.channel));
            }
        });
    },
    updateChannel: function(channelname) {
        console.info("Ustream.updateChannel");
        return this._qs.queueRequest(baseURL+'channels/'+channelname+".json").then((data) => {
            console.info("Ustream.updateChannel.requestCallback");
            if(data.json && data.json.channel) {
                return getChannelFromJSON(data.json.channel);
            }
            else {
                throw "Could not update channel " +channelname+ " for "+this.name;
            }
        });
    },
});

module.exports = Object.freeze(new Ustream(type));

