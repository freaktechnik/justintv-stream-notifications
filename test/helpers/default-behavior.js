import manifest from '../../webextension/manifest.json';

export const setup = () => {
    browser.runtime.connect.returns(global.SDKStubs);
    // Work around sinon-chrome being sinon < 2
    browser.storage.local.get.callsFake((props) => Promise.resolve(props));
    browser.storage.local.set.resolves();
    browser.i18n.getUILanguage.returns("en_US");
    browser.i18n.getMessage.returnsArg(0);
    browser.runtime.getPlatformInfo.resolves({
        os: 'ava-test',
        arch: 'node',
        "nacl_arch": 'x86'
    });
    browser.runtime.getManifest.returns(manifest);
};
