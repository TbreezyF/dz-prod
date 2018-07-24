//dropthemizer-worker.js
self.addEventListener("message", function(e) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            self.postMessage(this.responseText);
        }
    };
    xhttp.open("GET", "https://53a09147.ngrok.io/api/optimize/?url=" + e.data, true);
    xhttp.send();
});