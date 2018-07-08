/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module import
 */
import prefs from '../preferences';

const importPrefs = (preferences) => Promise.all(Object.entries(preferences).map(([
        key,
        value
    ]) => prefs.set(key, value))),
    importUsers = (controller, users) => Promise.all(users.map((user) => controller.addUser(user.login, user.type))),
    importChannels = (controller, channels) => Promise.all(channels.map((channel) => controller.addChannel(channel.login, channel.type))),
    importObject = (exportedObject, controller) => Promise.all([
        importPrefs(exportedObject.prefs),
        importUsers(controller, exportedObject.users),
        importChannels(controller, exportedObject.channels)
    ]),
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
        const exportedObject = await readFile(file);
        await importObject(exportedObject, controller);
    };

export default importFile;
