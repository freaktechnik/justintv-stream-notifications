/**
 * Test the serialized version of the providers module.
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import serializedProviders from "../../../src/background/providers/serialized";
import providers from "../../../src/background/providers";

const testSerialized = (t, provider) => {
    t.true("name" in provider, "has a name when serialized");
    t.is(typeof provider.supports, "object", "has a supports object when serialized");
    t.true("favorites" in provider.supports, "has favorites in the supports object when serialized");
    t.true("credentials" in provider.supports, "has credentials in the supports object when serialized");
    t.true("featured" in provider.supports, "has featured in the supports object when serialized");
};
testSerialized.title = (title, provider, p) => `${title} for ${p}`;

const testContent = (t, p) => {
    t.true(p in serializedProviders, "is in the serialized version");
    t.true(Object.isFrozen(serializedProviders[p]), "is a frozen serialized object");
    t.is(providers[p].name, serializedProviders[p].name, "Name matches");
    t.is(providers[p].supports.favorites, serializedProviders[p].supports.favorites, "Favorites is the same");
    t.is(providers[p].supports.credentials, serializedProviders[p].supports.credentials, "Credentials is the same");
    t.is(providers[p].supports.featured, serializedProviders[p].supports.featured, "Featured is the same");
};
testContent.title = (title, p) => `${title} of ${p}`;

const serialized = JSON.parse(JSON.stringify(serializedProviders));
for(const p in serialized) {
    test("Serialization", testSerialized, serialized[p], p);
}

for(const p in providers) {
    test('Serialized content', testContent, p);
}

test('Serialized providers object is frozen', (t) => {
    t.true(Object.isFrozen(serializedProviders));
});
