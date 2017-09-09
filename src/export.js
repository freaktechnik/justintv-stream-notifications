/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module export
 */
import ReadChannelList from './read-channel-list';
import prefs from './preferences';
import prefInfo from './prefs.json';


const getChannels = async () => {
        const list = new ReadChannelList(),
            channels = await list.getChannelsByType();
        return channels.map((c) => ({ login: c.login, type: c.type }));
    },
    getUsers = async () => {
        const list = new ReadChannelList(),
            users = await list.getUsersByType();
        return users.map((c) => ({ login: c.login, type: c.type }));
    },
    getPrefs = async () => {
        const prefNames = Object.keys(prefInfo),
            prefValues = await prefs.get(prefNames),
            ret = {};
        for(const i in prefNames) {
            ret[prefNames[i]] = prefValues[i];
        }
        return ret;
    },
    exportObject = async () => {
        const [
            channels,
            users,
            prefs
        ] = await Promise.all([
            getChannels(),
            getUsers(),
            getPrefs()
        ]);
        return {
            channels,
            users,
            prefs
        };
    },
    createBlob = (object) => {
        return new Blob([ JSON.stringify(object) ], {
            type: 'application/json'
        });
    },
    saveExport = async () => {
        const exported = await exportObject(),
            blob = createBlob(exported);

        return browser.downloads.download({
            url: URL.createObjectURL(blob),
            filename: `export-${Date.now()}.sne`
        });
    };

export default saveExport;
