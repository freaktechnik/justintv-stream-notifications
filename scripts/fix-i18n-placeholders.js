const fs = require("fs");
const util = require("util");
const path = require("path");

const rdir = util.promisify(fs.readdir);
const read = util.promisify(fs.readFile);
const write = util.promisify(fs.writeFile);

const encoding = 'utf8';

const fixLang = async (base, lang, placeholders) => {
    const file = path.join(__dirname, base, lang, 'messages.json');
    const source = await read(file, { encoding });
    const messages = JSON.parse(source);
    for(const k in placeholders) {
        messages[k].placeholders = placeholders[k];
    }

    return write(file, JSON.stringify(messages, null, 4));
};

const main = async (base, defaultLang = "en") => {
    let files = await rdir(path.join(__dirname, base));
    const placeholders = {};
    if(!files.includes(defaultLang)) {
        throw new Error(`Missing default language ${defaultLang}`);
    }

    const source = await read(path.join(__dirname, base, defaultLang, 'messages.json'), { encoding });
    const messages = JSON.parse(source);
    for(const k in messages) {
        if("placeholders" in messages[k]) {
            placeholders[k] = messages[k].placeholders;
        }
    }

    files = files.filter((f) => f !== defaultLang);

    return Promise.all(files.map((f) => fixLang(base, f, placeholders)))
};

main('../webextension/_locales');
