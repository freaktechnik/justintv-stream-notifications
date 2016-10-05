/**
 * Controller of the extension.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module main
 */
import prefs from 'sdk/simple-prefs';
/*import self from 'sdk/self';
import tabs from 'sdk/tabs';*/
import webExtension from "sdk/webextension";
import passwords from "sdk/passwords";
import { open } from "preferences-utils";
import parentalControls from './parental-controls';
import ChannelList from './channel/list';

//const BASE_URL = "http://streamnotifier.ch";

webExtension.startup().then(({ browser }) => {
    browser.runtime.onConnect.addListener((port) => {
        console.log(port);
        if(port.name != "sdk-connection") {
            return;
        }
        // Preference change listeners

        prefs.on("manageChannels", () => {
            port.postMessage({
                target: "pref-change",
                pref: "manageChannels"
            });
        });

        prefs.on("", (pref) => {
            //TODO pref undefined for toggles?
            port.postMessage({
                target: "pref-change",
                pref,
                value: prefs.prefs[pref]
            });
        });

        port.onMessage.addListener((message) => {
            if(message.target.startsWith("get-pref-")) {
                port.postMessage({
                    target: message.target + "-reply",
                    payload: prefs.prefs[message.pref]
                });
            }
            else if(message.target.startsWith("set-pref-")) {
                prefs.prefs[message.pref] = message.value;
                port.postMessage({
                    target: message.target + "-reply",
                });
            }
            else if(message.target == "migrate-channels") {
                const list = new ChannelList();
                list.getUsersByType().then((users) => {
                    return list.getChannelsByType().then((channels) => {
                        port.postMessage({
                            target: message.target + "-reply",
                            payload: [ channels, users ]
                        });
                    });
                }).catch((e) => {
                    console.error("Migration failed when trying to read in existing data");
                    console.error(e);
                });
            }
            else if(message.target == "passwords-search") {
                passwords.search({
                    url: message.url,
                    onSuccess(result) {
                        port.postMessage({
                            target: message.target + "-reply",
                            payload: result
                        });
                    },
                    onError(error) {
                        port.postMessage({
                            target: message.target + "-reply",
                            error
                        });
                    }
                });
            }
            else if(message.target == "pref-open") {
                open();
            }
            else if(message.target == "pc-enabled") {
                port.postMessage({
                    target: message.target + "-reply",
                    payload: parentalControls.enabled
                });
            }
        });
    });
}).catch((e) => console.error("Could not start webext", e));

// extension installation/upgrade stuff
/*if(self.loadReason == "install" && prefs.prefs.updateTab) {
    tabs.open({ url: BASE_URL + "/firstrun/" });
}
else if(self.loadReason == "upgrade" && prefs.prefs.updateTab) {
    tabs.open({
        url: BASE_URL + "/changes/" + self.version + "/",
        inBackground: true
    });
}*/
