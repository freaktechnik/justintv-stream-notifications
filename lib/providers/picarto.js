/**
 * Provider for picarto.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/picarto
 * @todo Fix live status detection. Probably not possible before picarto gets an API.
 */

"use strict";
const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
var _ = require("sdk/l10n").get;
var { Channel } = require('../channeluser');
const { GenericProvider } = require("./generic-provider");

var type          = "picarto",
    chatURL       = "",
    baseURL       = 'https://picarto.tv';

function getChannelFromUsername(username) {
    var ret        = new Channel();
    ret.uname      = username;
    ret.login      = username.toLowerCase();
    ret.type       = type;
    ret.image      = {101: baseURL + "/user_data/usrimg/" + ret.login + "/dsdefault.jpg"};
    ret.thumbnail  = baseURL + "/user_data/usrimg/" + ret.login + "/thumbnail_stream.png";
    ret.url.push(baseURL + "/" + ret.login);
    ret.archiveUrl = baseURL + "/" + ret.login;
    ret.chatUrl    = baseURL + "/chatpopout/" + ret.login;
    return ret;
}

const Picarto = newClass({
    extends: GenericProvider,
    authURL: [baseURL],
    getChannelDetails: function(channelname) {
        return this._qs.queueRequest(baseURL + "/user_data/usrimg/" + channelname.toLowerCase() + "/dsdefault.jpg")
            .then((resp) => {
                if(resp.status < 400)
                    return getChannelFromUsername(channelname);
                else
                    throw "Channel "+channelname+" does not exist for "+this.name;
            });
    },
    updateRequest: function(channels) {
        /*let urls = channels.map(function(channel) { return baseURL+"/live/channel.php?watch="+channel.login; });
        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (page, url) => {
            if(page.status < 400 && page.status !== 0) {
                let name = page.text.match(/<div id='channelheadname(?:_premium)?'>([^<]+)/)[1];
                let channel = getChannelFromUsername(name);
                if(page.text.indexOf("<div id='onlinestatus'>Offline</div>") == -1) {
                    channel.live = true;
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
    },
    updateChannel: function(channelname) {
        return this.getChannelDetails(channelname);
        /*let channel = getChannelFromUsername(channelname);
        return this._qs.queueRequest(baseURL + "/live/channel.php?watch=" + channelname).then((page) => {
            if(page.status < 400 && page.status !== 0 && page.text.indexOf("<div id='onlinestatus'>Offline</div>") == -1) {
                channel.live = true;
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
});

module.exports = new Picarto(type);

