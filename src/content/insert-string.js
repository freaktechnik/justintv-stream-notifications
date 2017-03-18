const attrMap = {
        "aria-label": "ariaLabel"
    },
    attrSeparator = ".",
    translateElement = (bundle, id, attr, simple = false) => {
        let str = ` data-l10n-id="${id}">`,
            string = bundle[id];
        if(attr && !(attr in attrMap)) {
            string = bundle[id + attrSeparator + attr];
        }
        else if(attr && attr in attrMap) {
            string = bundle[id + attrSeparator + attrMap[attr]];
        }

        if(!string || !("message" in string) || !string.message.trim().length) {
            throw `Empty string ${id}`;
        }
        else {
            string = string.message;
        }

        if(simple) {
            return string;
        }

        if(!attr) {
            str += string;
        }
        else {
            str = ` ${attr}="${string}"${str}`;
        }

        return str;
    };

module.exports = (defaultLanguage) => {
    //TODO cannot be found
    const bundle = require("../../webextension/_locales/" + defaultLanguage + "/messages.json");

    return translateElement.bind(null, bundle);
};
