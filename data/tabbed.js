/* 
 *  Created by Martin Giger
 *  Licensed under MPL 2.0
 */

window.onload = function() {
    var roots = document.querySelectorAll(".tabbed");
    for(var i = 0; i < roots.length; ++i) {
        new Tabbed(roots[i]);
    }
};

Tabbed.prototype.root = null;
Tabbed.prototype.length = 0;
Tabbed.prototype.current = 0;
function Tabbed(el) {
    this.root = el;
    this.length = this.root.querySelectorAll(".tabstrip li").length;

    var tabContents = this.root.querySelectorAll(".tabcontent");
    for(var i = 0; i < tabContents.length; ++i) {
        hide(tabContents[i]);
    }

    var tabs = this.root.querySelectorAll(".tabstrip li"), that = this;
    for(var i = 0; i < tabs.length; ++i) {
        tabs[i].tabIndex = -1;
        tabs[i].addEventListener("click", function(evt) {
            that.select(evt.currentTarget.dataset.tab);
        });
        tabs[i].addEventListener("keypress", function(evt) {
            console.log(evt.keyCode+" "+that.current);
            if(evt.keyCode == 37) {// left arrow key
                if(that.current != 1)
                    that.select(that.current - 1);
            }
            else if(evt.keyCode == 39) { // right arrow key
                if(that.current != that.length)
                    that.select(that.current + 1);
            }
        });
    }

    if(this.root.querySelectorAll(".tabstrip li.selected").length == 0 && this.length > 0) {
        this.select(1);
    }
    else {
        this.select(this.root.querySelector(".tabstrip li.selected").dataset.tab);
    }
}

Tabbed.prototype.select = function(index) {
    if(index <= this.length && index > 0) {
        var prevTab = this.root.querySelector(".tabstrip li.selected");
        if(prevTab) {
            prevTab.removeAttribute("aria-selected");
            prevTab.classList.remove("current");
            prevTab.tabIndex = -1;
            hide(this.getContentByIndex(prevTab.dataset.tab));
        }

        this.current = index;
        var tab = this.getTabByIndex(index);
        tab.setAttribute("aria-selected", "true");
        tab.classList.add("current");
        tab.tabIndex = 0;
        tab.focus();
        show(this.getContentByIndex(index));    
    }
};

Tabbed.prototype.getTabByIndex = function(index) {
    var tabs = this.root.querySelectorAll(".tabstrip li");
    for(var i = 0; i < tabs.length; ++i) {
        if(tabs[i].dataset.tab == index)
            return tabs[i];
    }
};

Tabbed.prototype.getContentByIndex = function(index) {
    var contents = this.root.querySelectorAll(".tabcontent");
    for(var i = 0; i < contents.length; ++i) {
        if(contents[i].dataset.tab == index)
            return contents[i];
    }
};

function hide(el) {
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
}

function show(el) {
    el.classList.remove("hidden");
    el.removeAttribute("aria-hidden");
}

