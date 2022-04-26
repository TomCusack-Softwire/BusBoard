function submit_form(event) {
    event.preventDefault();
    var form = new FormData(event.target);
    var postcode = form.get("postcode");
    var XHR = new XMLHttpRequest();
    XHR.open('GET', 'http://localhost:3000/departureBoards?postcode=' + postcode, true);
    XHR.setRequestHeader('Content-Type', 'application/json');

    XHR.onload = function () {
        // Handle response here using e.g. XHR.status, XHR.response, XHR.responseText
        if (XHR.status === 200) {
            document.getElementById("results").innerHTML = XHR.responseText;
        } else {
            console.error(XHR.response);
        }
    };

    XHR.send();
}