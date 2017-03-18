import manifest from '../../webextension/manifest.json';

export const setup = () => {
    browser.runtime.connect.returns(global.SDKStubs);
    browser.storage.local.get.returns(Promise.resolve({}));
    browser.i18n.getUILanguage.returns("en_US");
    browser.i18n.getMessage.returnsArg(0);
    browser.runtime.getPlatformInfo.returns(Promise.resolve({
        os: 'ava-test',
        arch: 'node',
        "nacl_arch": 'x86'
    }));
    browser.runtime.getManifest.returns(manifest);
};
