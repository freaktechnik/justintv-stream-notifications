/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Node filtering script
 */
 
function filter(query, root, rules) {
    var nodes = root.children;

    for(var i = 0; i < nodes.length; ++i) {
        if(query) {
            if(matches(nodes[i], query.toLowerCase(), rules))
                show(nodes[i]);
            else
                hide(nodes[i]);
        }
        else {
            show(nodes[i]);
        }
    }
}

function matches(node, query, rules) {
    var target = node;
    return rules.some(function(rule) {
        rule.attribute = rule.attribute || "textContent";
        if(rule.subtarget)
            target = node.querySelector(rule.subtarget);
        else
            target = node;

        if(rule.attribute == "class") {
            return checkClasses(target, query);
        }
        else {            
            return target[rule.attribute].toLowerCase().indexOf(query) != -1;
        }
    });
}

function checkClasses(node, query) {
    return query != "hidden" && node.className.toLowerCase().indexOf(query) != -1;
}
 