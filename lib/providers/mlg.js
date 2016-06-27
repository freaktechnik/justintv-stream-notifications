/**
 * MLG.tv Provider
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/mlg
 */
/*
Inofficial MLG.tv (major league gaming streams) API doc:

Username: cleartext username used in the channel URL
stream_name: mlg[0-9]+, which seems to be the stream ID
channel_id: [0-9]+, which seems to be the ID for the channel (used in image URLs and chat)


http://tv.majorleaguegaming.com/channel/{username}
http://chat.majorleaguegaming.com/{channel_id}


all of these seem to also support JSONP with the callback= parameter.
http://www.majorleaguegaming.com/player/config.json?id={username} username -> media[0].channel
http://streamapi.majorleaguegaming.com/service/streams/all status of all streams with stream_name and channel_id
http://streamapi.majorleaguegaming.com/service/streams/status/{stream_name} status and viewer count of just the specified stream
    status: -1 for offline, 1 for live, 2 for rebroadcast
http://www.majorleaguegaming.com/api/channels/all.js All the info about all the channels
    field parameter can limit the fields. You'll find the available fields if you don't specify any
http://www.majorleaguegaming.com/api/games/all.js All names and images for all game_id values
http://streamapi.majorleaguegaming.com/service/streams/playback/{stream name}?format=all playback URL + name & id

https://accounts.majorleaguegaming.com/follows/retrieve returns all the channel ids the currently logged in user (cookie mlg_login for username, mlg_id for the id) follows
There are also the actions to follow and unfollow a channel, but I am not sure how they work, as I don't care.

*/
"use strict";
import { emit } from "sdk/event/core";
import { Channel } from '../channel/core';
import { prefs } from "sdk/simple-prefs";
import GenericProvider from "./generic-provider";
import LiveState from "../channel/live-state";

const type = "mlg",
      chatURL = "http://chat.majorleaguegaming.com/",
      baseURL = 'http://streamapi.majorleaguegaming.com/service/streams/',
      infoURL = 'http://www.majorleaguegaming.com/api/channels/all.js',
      gameURL = 'http://www.majorleaguegaming.com/api/games/all.js',
      infoArgs = "?fields=id,slug,name,stream_name,subtitle,image_1_1,image_16_9_medium,url,bracket_url,game_id";

/**
 * @enum {number}
 * @name Status
 * @readonly
 * @property {number} Offline=-1
 * @property {number} Live=1
 * @property {number} Rebroadcast=2
 */
/**
 * @argument {module:providers/mlg~Status} satuts
 * @return {boolean} If the channel should be considered live.
 */
function isLive(status) {
    return status != -1 && (prefs.mlg_showRebroadcasts || status != 2);
}

// Takes a game_id
var games = [];

class MLG extends GenericProvider {
    constructor(type) {
        super(type);
        this.authURL = ["http://mlg.tv"];
    }

    async _getGame(id) {
        const game = games.find((g) => g.id == id);
        if(game) {
            const data = await this._qs.queueRequest(gameURL);
            if(data.json && data.json.data.items && data.json.data.items.length) {
                games = data.json.data.items;
                return data.json.data.items.find((g) => g.id == id).name;
            }
            else {
                throw data.json ? data.json.errors : "Could not fetch games for " + this.name;
            }
        }
        else {
            return game.name;
        }
    }
    async _getChannelFromJSON(jsonChannel) {
        console.info("MLG:getChannelFromJSON");
        const ret = new Channel(jsonChannel.stream_name, this._type);
        ret.uname = jsonChannel.name;
        ret.url.push(jsonChannel.url);
        ret.archiveUrl = jsonChannel.bracket_url ? jsonChannel.bracket_url : jsonChannel.url;
        ret.chatUrl = chatURL + jsonChannel.id;
        ret.image = { "200": jsonChannel.image_1_1 };
        ret.title = jsonChannel.subtitle;
        ret.thumbnail = jsonChannel.image_16_9_medium;
        try {
            let game = await this._getGame(jsonChannel.game_id);
            ret.category = game;
        }
        catch(e) {}

        return ret;
    }
    async getChannelDetails(channelname) {
        let data = await this._qs.queueRequest(infoURL+infoArgs);
        if(data.status == 200 && data.json.status_code == 200) {
            let cho = data.json.data.items.find((ch) => ch.slug.toLowerCase() == channelname.toLowerCase());
            return this._getChannelFromJSON(cho);
        }
        else {
            throw "Couldn't get the channel details for "+channelname+" for "+this.name;
        }
    }
    updateRequestchannels) {
        this._qs.queueUpdateRequest([baseURL+"all"], this._qs.HIGH_PRIORITY, async function(data) {
            let info = await this._qs.queueRequest(infoURL+infoArgs);

            if(data.json && data.json.status_code == 200 && info.json && info.json.status_code == 200) {
                let chans = data.json.data.items.filter((status) => {
                    return channels.some((channel) => status.stream_name == channel.login);
                });

                chans = await Promise.all(chans.map((status) => {
                    return this._getChannelFromJSON(info.json.data.items.find((ch) => ch.id == status.channel_id))
                    .then((channel) => {
                        if(status.status == 2)
                            channel.live = new LiveState(LiveState.REBROADCAST);
                        else
                            channel.live.setLive(isLive(status.status));
                        return channel;
                    });
                }));
                emit(this, "updatedchannels", chans);
            }
        }.bind(this));
    }
    async updateChannel(channelname) {
        console.info("MLG.updateChannel");
        let [data, info] = await Promise.all([
            this._qs.queueRequest(baseURL+'status/'+channelname),
            this._qs.queueRequest(infoURL+infoArgs)
        ]);
        console.info("MLG.updateChannel.requestCallback");
        if(data.json && data.json.status_code == 200 && info.json && info.json.status_code == 200) {
            let id = info.json.data.items.find((ch) => ch.id == data.json.data.channel_id);
            let channel = await this._getChannelFromJSON(id);
            if(data.json.data.status == 2)
                channel.live = new LiveState(LiveState.REBROADCAST);
            else {
                channel.live.setLive(isLive(data.json.data.status));
            }
            channel.viewers = data.json.data.viewers;

            return channel;
        }
        else {
            throw "Something went wrong when updating "+channelname;
        }
    }
    updateChannels(channels) {
        console.info("MLG.updateChannels");
        let [data, info] = await Promise.all([
            this._qs.queueRequest(baseURL+"all"),
            this._qs.queueRequest(infoURL+infoArgs)
        ]);

        if(data.json && data.json.status_code == 200 && info.json && info.json.status_code == 200) {
            let followedChannels = data.json.data.items.filter((status) => {
                return channels.some((channel) => status.stream_name == channel.login);
            });
            return Promise.all(followedChannels.map((status) => {
                let id = info.json.data.items.find((ch) => ch.id == status.channel_id);
                return this._getChannelFromJSON(id)
                .then((channel) => {
                    if(status.status == 2)
                        channel.live = new LiveState(LiveState.REBROADCAST);
                    else
                        channel.live.setLive(isLive(status.status));
                    return channel;
                });
            }));
        }
    }
}

export default new MLG(type);
