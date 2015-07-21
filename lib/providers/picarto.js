/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

//TODO get live status and maybe a title or something

"use strict";
var _ = require("sdk/l10n").get;
let { all, reject, resolve } = require("sdk/core/promise");
var { Channel, User } = require('../channeluser');

var type          = "picarto",
    chatURL       = "",
    baseURL       = 'https://picarto.tv',
    headers       = {};

var qs = require("../queueservice").getServiceForProvider(type);

function requeue(response) {
    return response.status > 499;
}

function getChannelFromUsername(username) {
    var ret        = new Channel();
    ret.uname      = username;
    ret.login      = username;
    ret.type       = type;
    ret.image      = {101: baseURL + "/channel_img/" + username + "/dsdefault.jpg"};
    ret.thumbnail  = baseURL + "/channel_img/" + username + "/thumbnail_stream.png";
    ret.url.push(baseURL + "/live/channel.php?watch=" + username);
    ret.url.push(baseURL + "/live/channelhd.php?watch=" + username);
    ret.url.push(baseURL + "/live/multistream.php?watch=" + username);
    ret.archiveUrl = baseURL + "/live/channel.php?watch=" + username;
    // that's not a dedicated chat page, but whatever.
    ret.chatURL    = baseURL + "/live/channelhd.php?watch=" + username;
    return ret;
}

const Picarto = {
    name: _("provider_"+type),
    toString: function() { return this.name; },
    authURL: ["http://picarto.tv"],
    supports: { favorites: false, credentials: false },
    getUserFavorites: function(username) {
        return reject(this.name+".getUserFavorites is not supported.");
    },
    getChannelDetails: function(channelname) {
        return resolve(getChannelFromUsername(channelname));
    },
    updateFavsRequest: function(users, userCallback, channelCallback) {
        throw new Error(this.name+".updateFavsRequest is not supported.");
    },
    removeFavsRequest: function() {
        qs.unqueueUpdateRequest(qs.LOW_PRIORITY);
    },
    updateRequest: function(channels, callback) {
        var urls = channels.map(function(channel) { return baseURL+"/live/channel.php?watch="+channel.login; });
        qs.queueUpdateRequest(urls, headers, qs.HIGH_PRIORITY, requeue, function(page) {
            if(page.status < 400 && page.status !== 0) {
                let name = page.text.match(/<div id='channelheadname'>([^<]+)<\/div>/)[1];
                let channel = getChannelFromUsername(name);
                if(page.text.indexOf("<div id='onlinestatus'>Offline</div>") == -1) {
                    channel.live = true;
                    channel.title = page.text.match(/<div id='channelhead'>([^<]+)<\/div>/)[1];
                    channel.category = page.text.match(/Content: ([a-zA-Z0-9]+)/)[1];
                    channel.viewers = page.text.match(/<div id="channelviewer" title="Viewer of the Channel"><img src="..\/img\/viewericon.png" alt="Viewer"> ([0-9]+)<\/div>/)[1];
                }
                callback(channel);
            }
        });
    },
    removeRequest: function() {
        qs.unqueueUpdateRequest(qs.HIGH_PRIORITY);
    },
    updateChannel: function(channelname) {
        let channel = getChannelFromUsername(channelname);
        return qs.queueRequest(baseURL + "/live/channel.php?watch=" + channelname, headers, requeue).then((page) => {
            if(page.status < 400 && page.status !== 0 && page.text.indexOf("<div id='onlinestatus'>Offline</div>") == -1) {
                channel.live = true;
                channel.title = page.text.match(/<div id='channelhead'>([^<]+)<\/div>/)[1];
                channel.category = page.text.match(/Content: ([a-zA-Z0-9]+)/)[1];
                channel.viewers = page.text.match(/<div id="channelviewer" title="Viewer of the Channel"><img src="..\/img\/viewericon.png" alt="Viewer"> ([0-9]+)<\/div>/)[1];
            }
            return channel;
        });
    },
    updateChannels: function(channels) {
        return all(channels.map((channel) => this.updateChannel(channel.login)));
    }
};

module.exports = Picarto;

