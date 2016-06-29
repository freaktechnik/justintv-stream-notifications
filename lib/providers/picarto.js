/**
 * Provider for picarto.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/picarto
 * @todo Fix live status detection. Probably not possible before picarto gets an API.
 */

"use strict";
import { emit } from "sdk/event/core";
import { get as _ } from "sdk/l10n";
import { Channel } from '../channel/core';
import GenericProvider from "./generic-provider";

var type          = "picarto",
    chatURL       = "",
    baseURL       = 'https://picarto.tv';

function getChannelFromUsername(username) {
    var ret        = new Channel(username.toLowerCase(), type);
    ret.uname      = username;
    ret.image      = {101: baseURL + "/user_data/usrimg/" + ret.login + "/dsdefault.jpg"};
    ret.thumbnail  = baseURL + "/user_data/usrimg/" + ret.login + "/thumbnail_stream.png";
    ret.url.push(baseURL + "/" + ret.login);
    ret.archiveUrl = baseURL + "/" + ret.login;
    ret.chatUrl    = baseURL + "/chatpopout/" + ret.login;
    return ret;
}

class Picarto extends GenericProvider {
    constructor(type) {
        super(type);
        this._enabled = false;
        this.authURL = [baseURL];
    }

    getChannelDetails(channelname) {
        return this._qs.queueRequest(baseURL + "/user_data/usrimg/" + channelname.toLowerCase() + "/dsdefault.jpg")
            .then((resp) => {
                if(resp.status < 400)
                    return getChannelFromUsername(channelname);
                else
                    throw "Channel "+channelname+" does not exist for "+this.name;
            });
    }
    updateRequest(channels) {
        /*let urls = channels.map(function(channel) { return baseURL+"/live/channel.php?watch="+channel.login; });
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (page, url) => {
            if(page.status < 400 && page.status !== 0) {
                let name = page.text.match(/<div id='channelheadname(?:_premium)?'>([^<]+)/)[1];
                let channel = getChannelFromUsername(name);
                if(page.text.indexOf("<div id='onlinestatus'>Offline</div>") == -1) {
                    channel.live.setLive(true);
                    channel.title = page.text.match(/<div id='channelhead(?:_premium)?'>([^<]+)/)[1];
                    let cat = page.text.match(/Content: ([a-zA-Z0-9]+)/);
                    if(cat)
                        channel.category = cat[1];
                    else
                        channel.category = _("provider_picarto_multistream");
                    channel.viewers = page.text.match(/<div id="channelviewer" title="Viewer(?: of the Channel)?"><img src="\.\.\/img\/viewericon\.png" alt="Viewer"> ([0-9]+)<\/div>/)[1];
                }
                emit(this, "updatedchannels", channel);
            }
        });*/
    }
    updateChannel(channelname) {
        return this.getChannelDetails(channelname);
        /*let channel = getChannelFromUsername(channelname);
        return this._qs.queueRequest(baseURL + "/live/channel.php?watch=" + channelname).then((page) => {
            if(page.status < 400 && page.status !== 0 && page.text.indexOf("<div id='onlinestatus'>Offline</div>") == -1) {
                channel.live.setLive(true);
                channel.title = page.text.match(/<div id='channelhead(?:_premium)?'>([^<]+)/)[1];
                let cat = page.text.match(/Content: ([a-zA-Z0-9]+)/);
                    if(cat)
                        channel.category = cat[1];
                    else
                        channel.category = _("provider_picarto_multistream");
                    channel.viewers = page.text.match(/<div id="channelviewer" title="Viewer(?: of the Channel)?"><img src="\.\.\/img\/viewericon\.png" alt="Viewer"> ([0-9]+)<\/div>/)[1];
            }
            return channel;
        });*/
    }
}

export default Object.freeze(new Picarto(type));
