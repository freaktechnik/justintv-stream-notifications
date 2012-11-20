addon.port.on("add", function (channel) {
    var element = document.createElement('li');
    var link = document.createElement('a');
	var textNode = document.createTextNode (channel.names[0]);
    element.id = channel.names[0];
	link.appendChild(textNode);
    link.href = 'javascript:openTab("http://'+channel.url[0]+'")';
    element.appendChild(link);
    document.getElementById('channels').appendChild(element);
});

addon.port.on("remove", function(channel) {
    document.getElementById('channels').removeChild(document.getElementById(channel)); 
});

function openTab(url) {
    addon.port.emit("openTab",url);
}