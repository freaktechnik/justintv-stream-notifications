"use strict";

const fs = require("fs"),
    { promisify } = require("util"),
    path = require("path"),
    writefile = promisify(fs.writeFile),
    writeTXRCFromEnv = () => {
        if(process.env.TRANSIFEX_USER && process.env.TRANSIFEX_PASSWORD) {
            const fileContent = `[https://www.transifex.com]
hostname = https://www.transifex.com
username = ${process.env.TRANSIFEX_USER}
password = ${process.env.TRANSIFEX_PASSWORD}
token =`;
            return writefile(path.join(__dirname, '../.transifexrc'), fileContent, {
                encoding: 'utf8'
            });
        }
        return Promise.resolve();
    };

writeTXRCFromEnv()
    .catch(() => {
        // discard errors
    });
