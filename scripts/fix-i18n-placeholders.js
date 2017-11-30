"use strict";

const fs = require("fs"),
    util = require("util"),
    path = require("path"),
    rdir = util.promisify(fs.readdir),
    read = util.promisify(fs.readFile),
    write = util.promisify(fs.writeFile),
    encoding = 'utf8',
    INDENT = 4,
    FILE_NAME = "messages.json",
    fixLang = async (base, lang, placeholders) => {
        const file = path.join(__dirname, base, lang, FILE_NAME),
            source = await read(file, { encoding }),
            messages = JSON.parse(source);
        let fixedSomething = false;
        for(const k in placeholders) {
            if(!("placeholders" in messages[k])) {
                messages[k].placeholders = placeholders[k];
                fixedSomething = true;
            }
        }

        if(fixedSomething) {
            console.log("Saving fixed messages for", lang);
            await write(file, JSON.stringify(messages, null, INDENT));
        }
    },
    main = async (base, defaultLang = "en") => {
        let files = await rdir(path.join(__dirname, base));
        const placeholders = {};
        if(!files.includes(defaultLang)) {
            throw new Error(`Missing default language ${defaultLang}`);
        }

        const source = await read(path.join(__dirname, base, defaultLang, FILE_NAME), { encoding }),
            messages = JSON.parse(source);
        for(const k in messages) {
            if("placeholders" in messages[k]) {
                placeholders[k] = messages[k].placeholders;
            }
        }

        files = files.filter((f) => f !== defaultLang);

        return Promise.all(files.map((f) => fixLang(base, f, placeholders)));
    };

main('../webextension/_locales');
