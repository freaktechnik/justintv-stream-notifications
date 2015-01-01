/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Node filtering script
 */
 
function filter(query, root, rules) {
    var nodes = root.children;
    if(query)
        query = query.toLowerCase();

    for(var i = 0; i < nodes.length; ++i) {
        if(query) {
            if(matches(nodes[i], query, rules)
                show(nodes[i]);
            else
                hode(nodes[i]);
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
        
        
        return target[rule.attribute].toLowerCase().indexOf(query) != -1;
    });
}
 