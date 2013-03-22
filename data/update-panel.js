/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */

//"use strict";


addon.port.on("add", function(channel) {
    var element = document.createElement('li');
    var link = document.createElement('a');
	var image = new Image();
	image.src = channel.image[0];
	var textNode = document.createTextNode(channel.name);
    element.id = channel.login;
	link.appendChild(image);
	link.appendChild(textNode);
    link.href = 'javascript:openTab("'+channel.login+'")';
	link.title = channel.title;
    element.appendChild(link);
    document.getElementById('offline-list').appendChild(element);
	updatePanel();
});

function openTab(channel) {
    addon.port.emit("openTab",channel);
}

function resizePanel() {
    document.getElementById("refresh").style.display = "none";
    document.getElementById("arrow").style.display = "none";
    document.body.style.overflow = "hidden";
    var h,width,padding=parseInt(window.getComputedStyle(document.body).marginLeft),w=document.body;
    do {
        h = w.scrollHeight;
        width = w.scrollWidth>addon.options.minWidth ? w.scrollWidth : addon.options.minWidth;
        document.body.style.width = width+"px";
    }while(h!=w.scrollHeight);
    document.getElementById("refresh").style.display = "block";
    document.body.style.width = "";
	addon.port.emit("resizePanel",[width+2*padding+2,h+2*padding]);
}

addon.port.on("resizeDone",function() {
    document.body.style.overflow = "visible";
});


function showMessage() {
    var l = document.getElementById('live').getElementsByTagName("LI").length;
    var channelslive = document.getElementById('channelslive');
	if(l>0&&channelslive.style.display=='none') {
		channelslive.style.display = 'block';
		document.getElementById("live").style.display = 'block';
		document.getElementById("channelsoffline").style.display = 'none';
	}
	else if(l==0&&channelslive.style.display=='block') {
		channelslive.style.display = 'none';
		document.getElementById("live").style.display = 'none';
		document.getElementById("channelsoffline").style.display = 'block';
	}
    
    var lo = document.getElementById('offline-list').getElementsByTagName("LI").length;
    var arrow = document.getElementById('arrow');
    if(lo>0&&arrow.style.display=='none')
        arrow.style.display='block';
    else if(lo==0&&arrow.style.display=='block') {
        arrow.style.display='none';
        arrow.classList.remove('rotated');
        document.getElementById("offline").classList.remove('openlist');
    }
}

function updatePanel() {
	showMessage();
	resizePanel();
}

function forceRefresh() {
    addon.port.emit("refresh");
}

function onLoad() {
    addon.port.emit("loaded");
    document.addEventListener("dragstart",function(e) {
        e.preventDefault();
    });
    resizePanel();
    getReloadbuttonShit();
}

function toggleOffline() {
    document.getElementById('offline').classList.toggle('openlist');
    document.getElementById('arrow').classList.toggle('rotated');
    updatePanel();
}

addon.port.on("remove", function(channel) { 
    document.getElementById('offline-list').removeChild(document.getElementById(channel));
	updatePanel();
});

addon.port.on("move", function(channel) {
    var node = document.getElementById(channel.login).cloneNode(true);
    var origin = 'offline-list', destination = 'live';
    if(!channel.live) {
        origin = 'live';
        destination = 'offline-list';
    }
    document.getElementById(origin).removeChild(document.getElementById(channel.login));
    document.getElementById(destination).appendChild(node);
    updatePanel();
});

window.onload = onLoad;

function getReloadbuttonShit() {
    try {
        var ss = addon.options.css.split("}");
        var refresh = document.getElementById("refresh");
        var r,b,n,h,a,i,na;
        for(var rule in ss) {
            na = false;
            if(ss[rule].match(/#urlbar-reload-button[a-z\-:\(\)\[\]]*:active/)&&!a) {
                na = true;
                var temp = getBackgroundPosition(ss[rule]);
                if(temp&&!a) {
                    a=temp;
                    addon.port.emit("log",a);
                    refresh.addEventListener("mousedown",function(e) {
                        addon.port.emit("log",a);
                        refresh.style.backgroundPosition = a;
                    });
                }
            }
            if(ss[rule].match(/#urlbar-reload-button[a-z\-:\(\)\[\]]*:hover[a-z\-:\(\)\[\]]*(?!:active)[a-z\-:\(\)\[\]]*,|#urlbar-reload-button[a-z\-:\(\)\[\]]*:hover[a-z\-:\(\)\[\]]*(?!:active)[a-z\-:\(\)\[\]]*\s*\{/)&&!h) {
                na = true;
                var temp = getBackgroundPosition(ss[rule]);
                if(temp&&!h) {
                    h=temp;
                    addon.port.emit("log",h);
                    refresh.addEventListener("mouseover",function(e) {
                        addon.port.emit("log",h);
                        refresh.style.backgroundPosition = h;
                    });
                    refresh.addEventListener("focus",function(e) {
                        addon.port.emit("log",h);
                        refresh.style.backgroundPosition = h;
                    });
                    refresh.addEventListener("mouseup",function(e) {
                        addon.port.emit("log",h);
                        refresh.style.backgroundPosition = h;
                    });
                }
            }
            if(ss[rule].contains("#urlbar-reload-button")&&!na) {
                var temp = getBackgroundPosition(ss[rule]);
                if(temp&&!n) {
                    n=temp;
                    addon.port.emit("log",n);
                    refresh.style.backgroundPosition = n;
                    refresh.addEventListener("mouseout",function(e) {
                        addon.port.emit("log",n);
                        refresh.style.backgroundPosition = n;
                    });
                    refresh.addEventListener("blur",function(e) {
                        addon.port.emit("log",n);
                        refresh.style.backgroundPosition = n;
                    });
                }
                if(!i) {
                    i = true;
                    refresh.style.backgroundImage = getBackgroundImage(ss[rule]);
                }
                //document.getElementById("refresh").style.height = height+"px";
                //document.getElementById("refresh").style.width = width+"px";
            }
            else if(ss[rule].contains("#urlbar > toolbarbutton")&&!i) {
                i = true;
                refresh.style.backgroundImage = getBackgroundImage(ss[rule]);
            }
        }
    }
    catch(e) {
        addon.port.emit("log",e.lineNumber);
        //console.log(e);
    }
}

function getBackgroundPosition(r) {
    var i = r.search(/-moz-image-region:\s*rect\(/)+24,dimensions = [],substr;
    if(i>23) {
        if(r.contains("-moz-image-region:rect(")) i--;
        substr = r.substring(i,r.indexOf(")",i));
        substr = substr.replace(" ","","g");
        dimensions = substr.split(",");
        dimensions[0] = "-"+dimensions[0];
        dimensions[3] = "-"+dimensions[3];
    }
    else if(r.contains("background-position")) {
        i = r.indexOf("background-position:")+20;
        substr = r.substring(i,r.indexOf(";",i));
        substr.split(" ");
        dimensions[0] = substr[1];
        dimensions[3] = substr[0];
    }
    else if(r.contains("background")&&!r.contains("background-")) {
        i = r.indexOf("background:")+11;
        substr = r.substring(i,r.indexOf(";",i));
        substr.split(" ");
        dimensions[0] = substr[2];
        dimensions[3] = substr[1];
    }
    else {
        return false;
    }
    //var height = dimensions[2]-dimensions[0];
    //var width = dimensions[1]-dimensions[3];
    return dimensions[3]+" "+dimensions[0];
}

function getBackgroundImage(r) {
    var i = r.indexOf('list-style-image:')+17;
    if(i>16) {
        addon.port.emit("log",r.substring(i,r.indexOf(";",i)));
        return r.substring(i,r.indexOf(";",i));
    }
    else if(r.contains("background-image")) {
        i = r.indexOf("background-image:")+17;
        return r.substring(i,indexOf(";",i));
    }
    else if(r.contains("background")) {
        i = r.indexOf("background:")+11;
        var substr = r.substring(i,r.indexOf(";",i));
        substr.split(" ");
        return substr[0];
    }
}
