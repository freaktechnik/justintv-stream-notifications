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
    const attrList = [
            'abbr',
            'alt',
            'content',
            'download',
            'label',
            'placeholder',
            'srcdoc',
            'style',
            'title',
            'value'
        ],
        ariaAttrMap = {
            'aria-label': 'ariaLabel',
            'aria-value-text': 'ariaValueText',
            'aria-moz-hint': 'ariaMozHint'
        },
        attrSeparator = '.',
        presentAttributes = element.dataset.l10nAttrs.split(",");

    // Translate allowed attributes.
    for(const attribute of presentAttributes) {
        let data;
        if(attrList.includes(attribute)) {
            data = browser.i18n.getMessage(element.dataset.l10nId + attrSeparator + attribute);
        }
        // Translate ARIA attributes
        else if(attribute in ariaAttrMap) {
            data = browser.i18n.getMessage(element.dataset.l10nId + attrSeparator + ariaAttrMap[attribute]);
        }

        if(data && data != "??") {
            element.setAttribute(attribute, data);
        }
    }
}

const C_TRANSLATE_VALUES = [
    'yes',
    'no'
];
function getTranslateState(element) {
    if(element === document.documentElement) {
        return "yes";
    }
    else if(element.hasAttribute("translate") && C_TRANSLATE_VALUES.includes(element.getAttribute("translate"))) {
        return element.getAttribute("translate");
    }
    return getTranslateState(element.parentNode);
}

function translateElement(element = document) {
    // Set the language attribute of the document.
    if(element === document) {
        document.documentElement.setAttribute("lang", browser.i18n.getUILanguage().replace("_", "-"));
    }
    // Get all children that are marked as being translateable.
    const children = element.querySelectorAll('*[data-l10n-id]:not([translate="no"])');
    for(const child of children) {
        if(getTranslateState(child) !== "no") {
            if(!child.dataset.l10nNocontent) {
                const data = browser.i18n.getMessage(child.dataset.l10nId);
                if(data && data != "??") {
                    child.textContent = data;
                }
            }
            if(child.dataset.l10nAttrs) {
                translateElementAttributes(child);
            }
        }
    }
}

if(document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", () => translateElement(), {
        capture: false,
        passive: true,
        once: true
    });
}
else {
    translateElement();
}
