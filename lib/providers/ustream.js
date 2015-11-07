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
    var ret        = new Channel();
    ret.login      = jsonChannel.id;
    ret.uname      = jsonChannel.title;
    ret.url.push(jsonChannel.tinyurl);
    ret.archiveUrl = jsonChannel.tinyurl;
    ret.chatUrl    = chatURL + jsonChannel.id;
    ret.image      = { "48": jsonChannel.owner.picture};
    ret.type       = type;
    ret.title      = "";
    ret.category   = "";
    if(jsonChannel.tags.length)
        ret.category = jsonChannel.tags[0];
    ret.live       = jsonChannel.status == "live";
    ret.thumbnail  = jsonChannel.thumbnail.live;
    ret.viewers    = ret.live ? jsonChannel.stats.viewer : jsonChannel.stats.viewer_total;
    return ret;
}

const Ustream = newClass({
    extends: GenericProvider,
    authURL: ["http://ustream.tv"],
    getChannelDetails: async(function*(channelname) {
        let data = yield this._qs.queueRequest("http://ustream.tv/"+channelname);

        if(data.status == 200) {
            var channelId = data.text.match(/<meta name="ustream:channel_id" content="([0-9]+)">/)[1];
            let response = yield this._qs.queueRequest(baseURL+"channels/"+channelId+".json");

            if(response.json && response.json.channel)
                return getChannelFromJSON(response.json.channel);
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
        return this._qs.queueRequest(baseURL+'channels/'+channelname).then((data) => {
            console.info("Ustream.updateChannel.requestCallback");
            if(data.json && data.json.channel) {
                return getChannelFromJSON(data.json.channel);
            }
        });
    },
});

module.exports = new Ustream(type);

