/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module import
 */
import prefs from '../preferences.js';
import providers from './providers/index.js';

//TODO somehow batch up imports, so we don't hit the twitch rate limits as easily when importing lots of single channels -> workaround: prompt user in channelmanager to continue import to create some time inbetween?

const importPrefs = (preferences) => Promise.all(Object.entries(preferences).map(([
        key,
        value
    ]) => prefs.set(key, value))),
    importUsers = (controller, users) => controller.getUsersByType()
        .then((existingUsers) => users.filter((user) => existingUsers.every((u) => u.type != user.type || (u.login != user.login && u.slug != user.login))))
        .then((importedUsers) => Promise.all(importedUsers.map((user) => controller.addUser(user.login, user.type)))),
    importChannels = (controller, channels) => controller.getChannelsByType()
        .then((existingChannels) => channels.filter((channel) => existingChannels.every((c) => c.type != channel.type || (c.login != channel.login && c.slug != channel.login))))
        .then((importedChannels) => Promise.all(importedChannels.map((channel) => controller.addChannel(channel.login, channel.type)))),
    importObject = (exportedObject, controller) => Promise.all([
        importPrefs(exportedObject.prefs),
        importUsers(controller, exportedObject.users)
            .then(() => importChannels(controller, exportedObject.channels))
    ]),
    getPermissions = async (exportedObject, controller) => {
        // Ensures all permissions are granted in order before the bulk import.
        const notOkProviders = new Set((await Promise.all(Object.keys(providers).map((p) => {
                if(providers[p].optionalPermissions.length) {
                    return browser.permissions.contains({
                        origins: providers[p].optionalPermissions
                    })
                        .then((hasPermission) => {
                            if(hasPermission) {
                                return null;
                            }
                            return p;
                        });
                }
                return null;
            }))).filter((p) => p)),
            newUsers = [],
            newChannels = [];
        if(!notOkProviders.size) {
            return exportedObject;
        }
        for(const user of exportedObject.users) {
            if(notOkProviders.has(user.type) && providers[user.type].optionalPermissions.length) {
                await controller.addUser(user.login, user.type);
                notOkProviders.delete(user.type);
            }
            else {
                newUsers.push(user);
            }
        }
        if(!notOkProviders.size) {
            return {
                prefs: exportedObject.prefs,
                users: newUsers,
                channels: exportedObject.channels
            };
        }
        for(const channel of exportedObject.channels) {
            if(notOkProviders.has(channel.type) && providers[channel.type].optionalPermissions.length) {
                await controller.addChannel(channel.login, channel.type);
                notOkProviders.delete(channel.type);
            }
            else {
                newChannels.push(channel);
            }
        }
        return {
            prefs: exportedObject.prefs,
            users: newUsers,
            channels: newChannels
        };
    },
    readFile = (file) => {
        const fileReader = new FileReader();
        return new Promise((resolve, reject) => {
            fileReader.addEventListener("error", reject, { once: true });
            fileReader.addEventListener("load", () => {
                resolve(JSON.parse(fileReader.result));
            }, { once: true });
            fileReader.addEventListener("abort", reject, { once: true });

            fileReader.readAsText(file);
        });
    },
    importFile = async (file, controller) => {
        const exportedObject = await readFile(file),
            restObject = await getPermissions(exportedObject, controller);
        await importObject(restObject, controller);
    };

export default importFile;
