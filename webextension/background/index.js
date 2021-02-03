browser.runtime.onInstalled.addListener(({
    reason
}) => {
    if(reason == 'install' || reason == 'update') {
        browser.tabs.create({
            url: browser.runtime.getURL('sunset.html')
        });
    }
});

browser.browserAction.onClicked.addListener(() => {
    browser.tabs.create({
        url: browser.runtime.getURL('sunset.html')
    });
});
