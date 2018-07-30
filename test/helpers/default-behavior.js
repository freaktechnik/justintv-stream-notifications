import manifest from '../../webextension/manifest.json';
import messages from '../../_locales/en/messages.json';

export const setup = () => {
    // Work around sinon-chrome being sinon < 2
    browser.storage.local.get.callsFake((props) => Promise.resolve(props));
    browser.storage.local.set.resolves();
    browser.i18n.getUILanguage.returns("en-US");
    browser.i18n.getMessage.callsFake((string) => {
        if(string in messages) {
            return messages[string].message;
        }
        console.warn("no translation for", string);
        return string;
    });
    browser.runtime.getPlatformInfo.resolves({
        os: 'ava-test',
        arch: 'node',
        "nacl_arch": 'x86'
    });
    browser.runtime.getManifest.returns(manifest);
    browser.runtime.getURL.returnsArg(0);
    browser.extension.getURL.returnsArg(0);
};
