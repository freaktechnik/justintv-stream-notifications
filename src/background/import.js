/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module import
 */
import prefs from '../preferences';

const importPrefs = (preferences) => {
        return Promise.all(Object.entries(preferences).map(([ key, value ]) => prefs.set(key, value)));
    },
    importUsers = (controller, users) => {
        return Promise.all(users.map((user) => controller.addUser(user.login, user.type)));
    },
    importChannels = (controller, channels) => {
        return Promise.all(channels.map((channel) => controller.addChannel(channel.login, channel.type)));
    },
    importObject = (exportedObject, controller) => {
        return Promise.all([
            importPrefs(exportedObject.prefs),
            importUsers(controller, exportedObject.users),
            importChannels(controller, exportedObject.channels)
        ]);
    },
    readFile = (file) => {
        const fileReader = new FileReader();
        return new Promise((resolve, reject) => {
            fileReader.onerror = reject;
            fileReader.onload = () => {
                resolve(JSON.parse(fileReader.result));
            };
            fileReader.onabort = reject;

            fileReader.readAsText(file);
        });
    },
    importFile = async (file, controller) => {
        const exportedObject = await readFile(file);
        await importObject(exportedObject, controller);
    };

export default importFile;
