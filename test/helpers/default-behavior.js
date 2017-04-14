import manifest from '../../webextension/manifest.json';
import defaultPrefs from '../../src/prefs.json';

global.defaultPrefReturn = {};
//TODO this adds overhead to launching the process
for(const p in defaultPrefs) {
    global.defaultPrefReturn[p] = defaultPrefs[p].value;
}

export const setup = () => {
    browser.runtime.connect.returns(global.SDKStubs);
    // Work around sinon-chrome being sinon < 2
    browser.storage.local.get.returns(Promise.resolve(global.defaultPrefReturn));
    browser.storage.local.set.returns(Promise.resolve());
    browser.i18n.getUILanguage.returns("en_US");
    browser.i18n.getMessage.returnsArg(0);
    browser.runtime.getPlatformInfo.returns(Promise.resolve({
        os: 'ava-test',
        arch: 'node',
        "nacl_arch": 'x86'
    }));
    browser.runtime.getManifest.returns(manifest);
};
