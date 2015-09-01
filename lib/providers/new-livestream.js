/**
 * New livestream provider. For API reverseenigneering see Issue #99
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/new-livestream
 */

"use strict";

const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
const { resolve } = require("sdk/core/promise");
const { Channel } = require("../channeluser");
const { GenericProvider } = require("./generic-provider");

const type = "newlivestream",
      baseURL = "http://livestream.com/api/accounts/",
      headers = {},
      requeue = (data) => data.status > 499;

const NewLivestream = newClass({
    extends: GenericProvider,
    authURL: ["http://livestream.com"],
    _getChannelFromJSON: function(json) {
        let chan = new Channel();
        chan.login = json.short_name || json.id;
        chan.uname = json.full_name;
        chan.image = {
            [json.picture.width]: json.picture.url,
            "170": json.picture.small_url,
            "50": json.picture.thumb_url
        };
        chan.category = json.category_name;
        chan.archiveUrl = "http://livestream.com/accounts/"+chan.login;
        chan.chatUrl = "http://livestream.com/accounts/"+chan.login;
        chan.type = this._type;

        let event = json.upcoming_events.data.find((event) => event.broadcast_id != -1)
            || json.past_events.data.find((event) => event.broadcast_id != -1);
        if(event) {
            chan.title = event.full_name;
            chan.viewers = event.viewer_count;
            chan.url.push("http://livestream.com/accounts/"+chan.login+"/events/"+event.id);
            return this._qs.queueRequest(baseURL+json.id+"/events/"+event.id+"/stream_info", headers, requeue).then((info) => {
                if(info.json && !info.json.message) {
                    chan.live = info.json.is_live;
                    chan.thumbnail = info.json.thumbnail_url;
                }
                return chan;
            });
        }
        else {
            return resolve(chan);
        }
    },
    getChannelDetails: function(channelname) {
        return this._qs.queueRequest(baseURL+channelname, headers, requeue).then((data) => {
            if(data.json && data.json.id) {
                return this._getChannelFromJSON(data.json);
            }
            else {
                throw "Couldn't get details for the new livestream channel "+channelname;
            }
        });
    },
    updateRequest: function(channels) {
        let urls = channels.map((channel) => baseURL+channel.login);
        this._qs.queueUpdateRequest(urls, headers, this._qs.HIGH_PRIORITY, requeue, (data) => {
            if(data.json && data.json.id) {
                this._getChannelFromJSON(data.json)
                    .then((channel) => emit(this, "updatedchannels", channel));
            }
        });
    }
});

module.exports = new NewLivestream(type);
