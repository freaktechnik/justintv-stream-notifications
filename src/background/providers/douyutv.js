/**
 * Douyutv provider. API reverseengineering is in #125.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/douyutv
 * @todo support adding by url slug name
 */
import { Channel } from '../channel/core';
import GenericProvider from "./generic-provider";
import md5 from 'md5';

const type = "douyutv",
    baseURL = "http://www.douyutv.com/api/v1/",
    roomURL = "http://www.douyutv.com",
    getChannelFromJSON = (json) => {
        const chan = new Channel(json.room_id, type);
        chan.uname = json.room_name;
        chan.title = json.subject;
        chan.url.push(roomURL + json.url);
        chan.image = {
            200: json.owner_avatar
        };
        chan.archiveUrl = roomURL + json.url;
        chan.live.setLive(json.show_status == "1");
        chan.thumbnail = json.room_src;
        chan.category = json.game_name;
        chan.viewers = json.online;
        return chan;
    },
    signAPI = (endpoint, id) => {
        const argument = endpoint + id + "?aid=android&client_sys=android&time=" + Date.now(),
            sign = md5(argument + '1231');
        return argument + "&auth=" + sign;
    };

class Douyutv extends GenericProvider {
    authURL = [ "http://www.douyutv.com" ];

    getChannelDetails(username) {
        return this._qs.queueRequest(baseURL + signAPI("room/", username)).then((data) => {
            if(data.parsedJSON && data.parsedJSON.error === 0) {
                return getChannelFromJSON(data.parsedJSON.data);
            }
            else {
                throw new Error("Couldn't get room info for douyutv channel with ID " + username);
            }
        });
    }
    updateRequest() {
        const getURLs = () => this._list.getChannels().then((channels) => channels.map((ch) => baseURL + signAPI("room/", ch.login)));
        return {
            getURLs,
            onComplete: async (data) => {
                if(data.parsedJSON && data.parsedJSON.error === 0) {
                    return getChannelFromJSON(data.parsedJSON.data);
                }
            }
        };
    }
}

export default Object.freeze(new Douyutv(type));
