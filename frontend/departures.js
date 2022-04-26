function submit_form(event) {
    event.preventDefault();
    document.body.style.cursor = "wait";
    document.getElementById("submit_button").disabled = true;
    document.getElementById("error").style.display = "none";

    var form = new FormData(event.target);
    var XHR = new XMLHttpRequest();
    XHR.open('GET', 'http://localhost:3000/departureBoards?postcode=' + form.get("postcode"), true);
    XHR.setRequestHeader('Content-Type', 'application/json');

    XHR.onload = function () {
        // Handle response here using e.g. XHR.status, XHR.response, XHR.responseText
        document.body.style.cursor = "default";
        document.getElementById("submit_button").disabled = false;

        if (XHR.status === 200 && XHR.responseText.indexOf("<table>") !== -1) {
            document.getElementById("results").innerHTML = XHR.responseText;
            document.getElementById("results_header").innerText = "Live arrivals at " + new Date().toLocaleTimeString("en-GB", {
                "hour": "2-digit",
                "minute": "2-digit",
                "second": "2-digit",
            });

            // Toggle 'please reload' div after a minute
            document.getElementById("reload").style.display = "none";
            setTimeout(function () {
                document.getElementById("reload").style.display = "block";
            }, 60000);
        } else {
            document.getElementById("error").style.display = "block";
            document.getElementById("error_text").innerHTML = XHR.responseText;
        }
    };

    XHR.send();
}
