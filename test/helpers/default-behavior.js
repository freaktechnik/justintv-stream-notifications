export const setup = () => {
    browser.runtime.connect.returns(global.SDKStubs);
    browser.storage.local.get.returns(Promise.resolve({}));
    browser.i18n.getUILanguage.returns("en_US");
    browser.i18n.getMessage.returnsArg(0);
};
