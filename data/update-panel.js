/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
 
addon.port.on("loadStart",function() {
    document.getElementById("loader").classList.remove("hidden");
    resizePanel();
    
});
addon.port.on("loadEnd",function() {
    document.getElementById("loader").classList.add("hidden");
    resizePanel();
});

addon.port.on("add", function(channel) {
    var element = document.createElement('li'),
        bgHelper = document.createElement('div'),
            link = document.createElement('a'),
                image = new Image(),
                    textNode = document.createTextNode(channel.name),
                    span = document.createElement('div'),
                        desc = document.createTextNode(channel.title);

	image.src = channel.image[0];
    image.classList.add("avatar");
    
    span.appendChild(desc);
    span.classList.add("hidden");
    
    if(addon.options.advancedStyling) {
        element.addEventListener("mouseenter",function(e) {
            link.style.color = channel.style.linkColor;
            link.style.backgroundColor = 'transparent';
            if(element.parentNode.id!='live-list') {
                if(channel.style.hasBgImage&&addon.options.backgroundImage) {
                    element.style.backgroundColor = 'transparent';
                    element.style.backgroundImage = 'url("'+channel.style.bgImage+'")';
                    bgHelper.style.backgroundColor =  'rgba('+getRGBValue(channel.style.bg,0)+','+getRGBValue(channel.style.bg,1)+','+getRGBValue(channel.style.bg,2)+',0.5)';
                }
                else {
                    element.style.background = channel.style.bg;
                }
            }
            span.style.color = channel.style.color;
            element.style.textShadow = "0 0 1px "+channel.style.bg+", 0 0 3px "+channel.style.bg+", 0 0 5px "+channel.style.bg;
            if(element.parentNode.id=='live-list'&&!addon.options.showTitle) {
                span.classList.remove("hidden");
                resizePanel();
            }
        },false);
        element.addEventListener("mouseleave",function(e) {
            link.style.backgroundColor = '';
            link.style.color = '';
            if(element.parentNode.id!='live-list') {
                element.style.backgroundColor = '';
                if(channel.style.hasBgImage&&addon.options.backgroundImage) {
                    element.style.backgroundImage = '';
                    bgHelper.style.backgroundColor = '';
                }
                element.style.textShadow = '';
            }
            span.style.color = '';
            if(element.parentNode.id=='live-list'&&!addon.options.showTitle) {
                span.classList.add("hidden");
                resizePanel();
            }
        },false);
    }
    else {
        element.classList.add("simple");
    }
    
    element.id = channel.type+'-'+channel.login;
    //element.contextmenu = 'context';
	link.appendChild(image);
	link.appendChild(textNode);
    link.appendChild(span);
    link.href = 'javascript:openTab("'+channel.login+'","'+channel.type+'")';
    element.onclick = function() {openTab(channel.login,channel.type)};
	link.title = channel.title;
    bgHelper.appendChild(link);
    element.appendChild(bgHelper);
    document.getElementById('offline-list').appendChild(element);
	updatePanel();
});

function getRGBValue(string,index) {
    var args = [1+index*2];
    if(3+index*2<string.length)
        args.push(3+index*2);

    return parseInt(string.slice.apply(string,args),16);
}

function openTab(channel,type) {
    addon.port.emit("openTab",channel,type);
}

function resizePanel() {
    console.log("resizing panel");
    document.body.style.overflow = "hidden";
    var h,width,w=document.body;
    do {
        h = w.scrollHeight;
        width = w.scrollWidth>addon.options.minWidth ? w.scrollWidth : addon.options.minWidth;
        document.body.style.width = width+"px";
    }while(h!=w.scrollHeight);
    document.body.style.overflow = "auto";
    document.body.style.width = "";
	addon.port.emit("resizePanel",[width,h]);
}

addon.port.on("resizeDone",function() {
    document.body.style.overflow = "visible";
});


function showMessage() {
    var l = document.getElementById('live-list').getElementsByTagName("LI").length;
    var live = document.getElementById('live');
	if(l>0&&live.classList.contains("hidden")) {
		live.classList.remove("hidden");
		document.getElementById("channelsoffline").classList.add("hidden");
	}
	else if(l==0&&!live.classList.contains("hidden")) {
		live.classList.add("hidden");
		document.getElementById("channelsoffline").classList.remove("hidden");
	}
    
    var lo = document.getElementById('offline-list').getElementsByTagName("LI").length;
    var arrow = document.getElementById('arrow');
    if(lo>0&&arrow.classList.contains('hidden')) {
        arrow.classList.remove('hidden');
    }
    else if(lo==0&&!arrow.classList.contains('hidden')) {
        arrow.classList.add('hidden');
        arrow.classList.remove('rotated');
        document.getElementById("offline").classList.add('hidden');
    }
}

function updatePanel() {
	showMessage();
	resizePanel();
}

function forceRefresh() {
    addon.port.emit("refresh");
}

function toggleOffline() {
    document.getElementById("offline").classList.toggle("hidden");
    document.getElementById("arrow").classList.toggle("rotated");
    resizePanel();
}

function onLoad() {
    addon.port.emit("loaded");
    document.addEventListener("dragstart",function(e) {
        e.preventDefault();
    });
    resizePanel();
}

addon.port.on("remove", function(channel,type) { 
    document.getElementById('offline-list').removeChild(document.getElementById(type+'-'+channel));
	updatePanel();
});

addon.port.on("move", function(channel) {
    var origin = 'offline-list', destination = 'live-list';
    var id = channel.type+'-'+channel.login;

    if(!channel.live) {
        origin = 'live-list';
        destination = 'offline-list';
    }

    var node = document.getElementById(origin).removeChild(document.getElementById(id));
    var span = node.getElementsByTagName('div')[0].getElementsByTagName('div')[0];
    if(channel.live) {
        node.getElementsByTagName('a')[0].title = channel.title;
        if(!channel.style.hasBgImage||!addon.options.backgroundImage) {
            node.style.backgroundColor = 'transparent';
            node.getElementsByTagName('div')[0].style.backgroundColor = 'rgba('+getRGBValue(channel.style.bg,0)+','+getRGBValue(channel.style.bg,1)+','+getRGBValue(channel.style.bg,2)+',0.7)';
            node.style.textShadow = "0 0 1px "+channel.style.bg+", 0 0 3px "+channel.style.bg+", 0 0 5px "+channel.style.bg;
        }
        node.style.backgroundImage = 'url("'+channel.thumbnail+'")';

        span.removeChild(span.childNodes[0])
        span.appendChild(document.createTextNode(channel.title));
        if(addon.options.showTitle&&span.classList.contains("hidden"))
            span.classList.remove("hidden");
    }
    else {
        if(channel.style.hasBgImage&&addon.options.backgroundImage) {
            node.style.backgroundImage = 'url("'+channel.style.bgImage+'")';
            node.getElementsByTagName('div')[0].style.backgroundColor = 'rgba('+getRGBValue(channel.style.bg,0)+','+getRGBValue(channel.style.bg,1)+','+getRGBValue(channel.style.bg,2)+',0.5)';
        }
        else {
            node.style.backgroundImage = '';
            node.style.backgroundColor = '';
            node.style.background = channel.style.bg;
        }
        node.style.textShadow = "";
        if(addon.options.showTitle)
            span.classList.add("hidden");
    }
    document.getElementById(destination).appendChild(node);
    updatePanel();
});

addon.port.on("updateTitle", function(channel) {
    updateTitle(channel);
    updatePanel();
});

function updateTitle(channel) {
    var node = document.getElementById(channel.type+'-'+channel.login);
    node.getElementsByTagName('a')[0].title = channel.title;
    var span = node.getElementsByTagName('div')[0].getElementsByTagName('div')[0];
    span.removeChild(span.childNodes[0]);
    span.appendChild(document.createTextNode(channel.title));
}

addon.port.on("updateThumb", function(channel) {
    var node = document.getElementById(channel.type+'-'+channel.login);
    node.style.backgroundImage = 'url("'+channel.thumbnail+'")';
});

window.onload = onLoad;

/* 
    The following functions get the rules from css, which defien the image appearance for the refresh button of the awesomebar.
    Those styles then get applied to the refresh button of the panel.
    No, there is no simpler solution.
    Yes, there's regex.
*/

addon.port.on("cssLoaded", function(css) {
    getReloadbuttonStyle(css);
});

function getReloadbuttonStyle(css) {
    console.log("processing stylesheets for reload button");
    // splits the css file into rule blocks
    var ss = css.split("}");
    var refresh = document.getElementById("refresh");
    var n,h,a,i,na;
    
    // I chose three ifs, since sometimes the hover and active state are in the same declaration.
    // I could possibly restructure the code to allow if/else if constructs, but the regex would
    // get even more complicated.
    // basically na defines, wether it should look for a default state.
    // a,h,n & i are the rules for the different states and declarations
    
    for(var rule in ss) {
        na = false;
        // should match any declaration for active state
        if(ss[rule].match(/#urlbar-reload-button[a-z\-:\(\)\[\]]*:active/)&&!a) {
            var temp = getBackgroundPosition(ss[rule]);
            if(temp&&!a) {
                na = true;
                a=temp;
                refresh.addEventListener("mousedown",function(e) {
                    if(e.button==0) {
                        applyStyles(refresh,a);
                    }
                });
            }
        }
        // should match any declaration ONLY for hover state
        if(ss[rule].match(/#urlbar-reload-button[a-z\-:\(\)\[\]]*:hover[a-z\-:\(\)\[\]]*(?!:active)[a-z\-:\(\)\[\]]*,|#urlbar-reload-button[a-z\-:\(\)\[\]]*:hover[a-z\-:\(\)\[\]]*(?!:active)[a-z\-:\(\)\[\]]*\s*\{/)&&!h) {
            var temp = getBackgroundPosition(ss[rule]);
            if(temp&&!h) {
                na = true;
                h=temp;
                refresh.addEventListener("mouseenter",function(e) {
                    applyStyles(refresh,h);
                });
                refresh.addEventListener("focus",function(e) {
                    applyStyles(refresh,h);
                });
                refresh.addEventListener("mouseup",function(e) {
                    if(e.button==0) {
                        applyStyles(refresh,h);
                    }
                });
            }
        }
        if(ss[rule].contains("#urlbar-reload-button")&&!na) {
            var temp = getBackgroundPosition(ss[rule]);
            if(temp&&!n) {
                n=temp;
                applyStyles(refresh,n);
                refresh.addEventListener("mouseleave",function(e) {
                    applyStyles(refresh,n);
                });
                refresh.addEventListener("blur",function(e) {
                    applyStyles(refresh,n);
                });
            }
            var img = getBackgroundImage(ss[rule])
            if(!i&&img) {
                i = true;
                refresh.style.backgroundImage = img;
            }
        }
        else if(ss[rule].contains("#urlbar > toolbarbutton")&&!i) {
            var img = getBackgroundImage(ss[rule]);
            if(img) {
                i = true;
                refresh.style.backgroundImage = img;
            }
        }
        
        // stop the search when we have everything we need
        if ( a&&h&&i&&n ) {
            break;
        }
    }
}

// applies the style to the provided element, needs an arra returned by getBackgroundPosition
function applyStyles(element,styleArray) {
    element.style.backgroundPosition = styleArray[0]+" "+styleArray[1];
    if(styleArray[2])
        element.style.height = styleArray[2];
    if(styleArray[3])
        element.style.width = styleArray[3];
}

// creates the argument for background-position based on different possible formats from the source
function getBackgroundPosition(r) {
    var i = r.search(/-moz-image-region:\s*rect\(/)+24,dimensions = [],substr,height,width;
    if(i>23) {
        if(r.contains("-moz-image-region:rect(")) i--;
        substr = r.substring(i,r.indexOf(")",i));
        substr = substr.replace(" ","","g");
        dimensions = substr.split(",");
        height = parseInt(dimensions[2],10)-parseInt(dimensions[0],10);
        width = parseInt(dimensions[1],10)-parseInt(dimensions[3],10);
        dimensions[0] = "-"+dimensions[0];
        dimensions[3] = "-"+dimensions[3];
    }
    else if(r.contains("background-position")) {
        i = r.indexOf("background-position:")+20;
        substr = r.substring(i,r.indexOf(";",i));
        substr.split(" ");
        dimensions[0] = substr[1];
        dimensions[3] = substr[0];
        height = getHeight(r);
        width = getWidth(r);        
    }
    else if(r.contains("background")&&!r.contains("background-")) {
        i = r.indexOf("background:")+11;
        substr = r.substring(i,r.indexOf(";",i));
        substr.split(" ");
        dimensions[0] = substr[2];
        dimensions[3] = substr[1];
        height = getHeight(r);
        width = getWidth(r);
    }
    else {
        return false;
    }
    
    var m = getUnit(dimensions[0]);
    height = height+m;
    width = width+m;
    
    return [dimensions[3],dimensions[0],height,width];
}

// gets the unit used in a rule
function getUnit(string) {
    if(parseInt(string,10)==0) {
        return "px";
    }
    return string.substring(string.length-2);
}

// those two get the height/width styles from the ruleset if possible
function getHeight(r) {
    var i;
    if(r.contains("height")) {
        i = r.indexOf("height:")+7;
        return parseInt(r.substring(i,r.indexOf(";",i)),10);
    }
    return null;
}
function getWidth(r) {
    var i;
    if(r.contains("width")) {
        i = r.indexOf("width:")+6;
        return r.substring(i,r.indexOf(";",i));
    }
    return null;
}

// gets the image url
function getBackgroundImage(r) {
    var i = r.indexOf('list-style-image:')+17;
    if(i>16) {
        return r.substring(i,r.indexOf(";",i));
    }
    else if(r.contains("background-image")) {
        i = r.indexOf("background-image:")+17;
        return r.substring(i,indexOf(";",i));
    }
    else if(r.contains("background")&&!r.contains("background-")) {
        i = r.indexOf("background:")+11;
        var substr = r.substring(i,r.indexOf(";",i));
        substr.split(" ");
        return substr[0];
    }
    return false;
}
