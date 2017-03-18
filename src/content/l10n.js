/**
 * Translates a HTMl page in the web l10n style from the Add-on SDK with
 * WebExtensions strings.
 * Large parts of the logic are very similar to the SDK implmentation.
 * All you have to do to use this in a document is load it.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */

function translateElementAttributes(element) {
    const attrList = [ 'title', 'accesskey', 'alt', 'label', 'placeholder' ],
        ariaAttrMap = {
            "ariaLabel": 'aria-label',
            "ariaValueText": 'aria-valuetext',
            "ariaMozHint": 'aria-moz-hint'
        },
        attrSeparator = '.';

    // Translate allowed attributes.
    for(const attribute of attrList) {
        const data = browser.i18n.getMessage(element.dataset.l10nId + attrSeparator + attribute);
        if(data && data != "??") {
            element.setAttribute(attribute, data);
        }
    }

    // Translate aria attributes.
    for(const attrAlias in ariaAttrMap) {
        const data = browser.i18n.getMessage(element.dataset.l10nId + attrSeparator + attrAlias);
        if(data && data != "??") {
            element.setAttribute(ariaAttrMap[attrAlias], data);
        }
    }
}

function translateElement(element = document) {

    // Get all children that are marked as being translateable.
    const children = element.querySelectorAll('*[data-l10n-id]');
    for(const child of children) {
        const data = browser.i18n.getMessage(child.dataset.l10nId);
        if(data && data != "??") {
            child.textContent = data;
        }
        translateElementAttributes(child);
    }
}

window.addEventListener("load", () => translateElement(), {
    capturing: false,
    passive: true
});