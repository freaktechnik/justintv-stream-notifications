/**
 * Node filtering script
 * @author Martin Giger
 * @license MPL-2.0
 */

/* global show */
/* global hide */

/**
 * @typedef {Object} Rule
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
 * @typedef {Array.<Rule>} RuleSet
 */

/**
 * Filter nodes inside a root by a query based on rules of which content strings
 * to check (textContent, classes, id etc.)
 * @argument {string} query
 * @argument {DOMNode} root
 * @argument {RuleSet} rules
 */
function filter(query, root, rules) {
    var nodes = root.children;

    for(var i = 0; i < nodes.length; ++i) {
        if(query) {
            if(matches(nodes[i], query, rules))
                show(nodes[i]);
            else
                hide(nodes[i]);
        }
        else {
            show(nodes[i]);
        }
    }
}

/**
 * Check if a node matches the given query based on the rules. Matches are
 * case insensitive.
 * @argument {DOMNode} node
 * @argument {string} query - Can be mutliple queries that all must match,
 *                            separated by a space.
 * @argument {RuleSet} rules
 * @return {boolean} Indicates if the node matches the query or not.
 */
function matches(node, query, rules) {
    query = query.toLowerCase();
    var target = node,
        queries = query.split(" ");
    return queries.every(function(q) {
        return rules.some(function(rule) {
            rule.attribute = rule.attribute || "textContent";
            if(rule.subtarget)
                target = node.querySelector(rule.subtarget);
            else
                target = node;

            if(rule.attribute == "class") {
                return checkClasses(target, q);
            }
            else {
                return target[rule.attribute].toLowerCase().indexOf(q) != -1;
            }
        });
    });
}

/**
 * Check the classes of a node for the query.
 * @argument {DOMNode} node
 * @arguemnt {string} query
 */
function checkClasses(node, query) {
    var classes = node.className.toLowerCase();
    // remove hidden from the list of classes
    if(node.classList.contains("hidden"))
        classes = classes.replace("hidden", "").trim();

    return classes.indexOf(query) != -1;
}

