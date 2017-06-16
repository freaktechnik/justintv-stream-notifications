/**
 * Controller of the extension.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module main
 */
import prefs from 'sdk/simple-prefs';
import self from 'sdk/self';
import webExtension from "sdk/webextension";
import passwords from "sdk/passwords";
import parentalControls from './parental-controls';
import ChannelList from './channel/list';
import pkg from "../package.json";

webExtension.startup().then(({ browser }) => {
    browser.runtime.onConnect.addListener((port) => {
        if(port.name != "sdk-connection") {
            return;
        }

        port.onMessage.addListener((message) => {
            if(message.command == "migrate-prefs") {
                const exportedPrefs = {};
                for(const p in pkg.preferences) {
                    exportedPrefs[p.name] = prefs.prefs[p.name];
                }
                port.postMessage({
                    command: message.command + "-reply",
                    payload: exportedPrefs
                });
            }
            else if(message.command == "migrate-channels") {
                const list = new ChannelList();
                list.getUsersByType().then((users) => {
                    return list.getChannelsByType().then((channels) => {
                        port.postMessage({
                            command: message.command + "-reply",
                            payload: [ channels, users ]
                        });
                    });
                }).catch((e) => {
                    console.error("Migration failed when trying to read in existing data");
                    console.error(e);
                });
            }
            else if(message.command.startsWith("passwords-search-")) {
                passwords.search({
                    url: message.payload,
                    onSuccess(result) {
                        port.postMessage({
                            command: message.command + "-reply",
                            payload: result
                        });
                    },
                    onError(error) {
                        port.postMessage({
                            command: message.command + "-reply",
                            error
                        });
                    }
                });
            }
            else if(message.command == "pc-enabled") {
                port.postMessage({
                    command: message.command + "-reply",
                    payload: parentalControls.enabled
                });
            }
            else if(message.command == "load-reason") {
                port.postMessage({
                    command: message.command + "-reply",
                    payload: self.loadReason
                });
            }
        });
    });
}).catch((e) => console.error("Could not start webext", e));
