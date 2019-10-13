/**
 * Node filtering script.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */
import {
    show, hide
} from './utils.js';

/**
 * @typedef {object} Rule
 * @property {string} [attribute="textContent"] - The attribute this rule checks,
 *                                                if it's "class", individual
 *                                                classes on the Node are
 *                                                checked instead of matching
 *                                                the whole attribute against
 *                                                the query.
 * @property {string} [subtarget] - A selector for a node contained within the
 *                                  checked node as a holder of the potentially
 *                                  matching attribute.
 */
/**
 * An array of rules, of which at least one has to match in order for the whole
 * target to be matching the query.
 *
 * @typedef {[Rule]} RuleSet
 */

/**
 * Check the classes of a node for the query. Ignores the "hidden" class.
 *
 * @param {DOMNode} node - Node to check the classes on.
 * @param {string} query - The string to look for.
 * @returns {boolean} Indicates if the class has been found.
 */
function checkClasses(node, query) {
    let classes = node.className.toLowerCase();
    // remove hidden from the list of classes
    if(node.classList.contains("hidden")) {
        classes = classes.replace("hidden", "").trim();
    }

    return classes.includes(query);
}

/**
 * Check if a node matches the given query based on the rules. Matches are
 * case insensitive.
 *
 * @param {DOMNode} node - Node to search.
 * @param {string} query - Can be mutliple queries that all must match,
 *                         separated by a space.
 * @param {RuleSet} rules - Rules to apply the query to.
 * @returns {boolean} Indicates if the node matches the query or not.
 */
export function matches(node, query, rules) {
    query = query.toLowerCase();
    let target = node;
    const queries = query.split(" ");
    return queries.every((q) => rules.some((rule) => {
        rule.attribute = rule.attribute || "textContent";
        if(rule.subtarget) {
            target = node.querySelector(rule.subtarget);
        }
        else {
            target = node;
        }

        if(rule.attribute == "class") {
            return checkClasses(target, q);
        }

        return target[rule.attribute].toLowerCase().includes(q);
    }));
}

/**
 * Filter nodes inside a root by a query based on rules of which content strings
 * to check (textContent, classes, id etc.).
 *
 * @param {string} query - String to look for.
 * @param {DOMNode} root - Node to start search on.
 * @param {RuleSet} rules - Rules to apply to the query.
 * @returns {undefined}
 */
export function filter(query, root, rules) {
    const nodes = root.children;

    for(const element of nodes) {
        if(query) {
            if(matches(element, query, rules)) {
                show(element);
            }
            else {
                hide(element);
            }
        }
        else {
            show(element);
        }
    }
}
