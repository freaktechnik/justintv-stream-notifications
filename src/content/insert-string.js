const attrMap = {
        "aria-label": "ariaLabel"
    },
    attrSeparator = ".",
    getString = (bundle, id) => {
        const str = bundle[id];
        if(!str || !("message" in str) || !str.message.trim().length) {
            throw new Error(`Empty string ${id}`);
        }
        return str.message;
    },
    translateElement = (bundle, id, attrs, simple = false, noContent = false) => {
        if(simple) {
            return getString(bundle, id);
        }

        let string = '';
        if(attrs && attrs.length > 0) {
            for(const attr of attrs) {
                let a = attr;
                if(attr in attrMap) {
                    a = attrMap[attr];
                }
                string += ` ${attr}="${getString(bundle, id + attrSeparator + a)}"`;
            }
            string += ` data-l10n-attrs="${attrs.join(',')}"`;
        }

        if(noContent && attrs.length === 0) {
            // This shouldn't be hit, but you never know.
            string += '" translate="no"';
        }
        else if(noContent) {
            string += ' data-l10n-nocontent';
        }

        string += ` data-l10n-id="${id}">`;

        if(!noContent) {
            string += getString(bundle, id);
        }

        return string;
    };

module.exports = (defaultLanguage) => {
    const bundle = require("!!json-loader!../../_locales/" + defaultLanguage + "/messages.json");

    return translateElement.bind(null, bundle);
};
