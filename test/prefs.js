import test from 'ava';
import Ajv from 'ajv';
import prefs from '../src/prefs.json';
import schema from './helpers/prefs.schema.json';
import translations from '../_locales/en/messages.json';

test('Prefs follow the schema', (t) => {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);

    if(!validate(prefs)) {
        t.fail(validate.errors);
    }
    else {
        t.pass();
    }
});

const translation = (t, prefName, pref) => {
    t.true(`${prefName}_title` in translations);
    t.false(translations[`${prefName}_title`].message.endsWith("."));
    // The pref may or may not have a description.
    if(`${prefName}_description` in translations) {
        t.true(translations[`${prefName}_description`].message.endsWith("."));
    }

    if("options" in pref) {
        for(const { label } of pref.options) {
            t.true(`${prefName}_options.${label}` in translations);
        }
    }
};
translation.title = (title, prefName) => `${title} for ${prefName}`;

for(const p in prefs) {
    test('Translations exist', translation, p, prefs[p]);
}
