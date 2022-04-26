const fs = require("fs");
const request = require("request");
const express = require("express");

// get API key, if it exists
let api_key = "";
try {
    api_key = "?app_key=" + fs.readFileSync("api_key", "utf-8");
} catch (_) {}

function get_StopPoint_data(stop_id) {
    let url = "https://api.tfl.gov.uk/StopPoint/" + stop_id + "/Arrivals" + api_key;

    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (response && response.statusCode !== 200) {
                reject("Error accessing StopPoint stop.");
            } else {
                let json = JSON.parse(body);
                if (json.length > 0) {
                    for (let bus of json) {
                        let minutes = (new Date(bus["expectedArrival"]) - new Date()) / 60000;
                        bus["minutesNumber"] = minutes;
                        if (minutes <= 0) {
                            bus["minutes"] = "Due";
                        } else if (minutes <= 1) {
                            bus["minutes"] = "1 min";
                        } else {
                            bus["minutes"] = Math.ceil(minutes) + " mins";
                        }
                    }

                    json.sort((a, b) => a["minutesNumber"] - b["minutesNumber"]);
                    resolve(json.slice(0, 5));
                } else {
                    resolve("No buses scheduled right now.");
                }
            }
        });
    });
}

function get_lat_long(postcode) {
    let url = "https://api.postcodes.io/postcodes/" + postcode;
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            let json = JSON.parse(body);
            if (json["status"] !== 200) {
                reject(json["error"]);
            } else {
                resolve([json["result"]["latitude"], json["result"]["longitude"]]);
            }
        });
    });
}

function get_StopPoint_stations(lat, long) {
    let url = "https://api.tfl.gov.uk/StopPoint/?lat=" + lat + "&lon=" + long + "&stopTypes=NaptanPublicBusCoachTram&" + api_key.slice(1);
    return new Promise((resolve) => {
        request(url, (error, response, body) => {
            let stops = JSON.parse(body)["stopPoints"];
            stops.sort((a, b) => a["distance"] - b["distance"]);
            resolve(stops);
        });
    });
}

function get_data_from_station(station) {
    if (station === undefined) {
        return;
    }

    return get_StopPoint_data(station["id"])
        .then((timetable) => {
            let message = "<h3 style='font-weight: normal;'><b><a class='no-link' title='Click to go to the TFL website for this stop.' href='https://tfl.gov.uk/bus/stop/";
            message += station["id"] + "'>" + station["commonName"] + "</a></b> (" + station["distance"].toFixed(0) + "m away)</h3>\n<table>\n";
            for (let bus of timetable) {
                message += "<tr><td>" + bus["lineName"] + "</td><td>" + bus["destinationName"] + "</td><td>" + bus["minutes"] + "</td></tr>\n";
            }
            message += "</table>";
            return message;
        });
}

function postcode_to_timetable(postcode) {
    return get_lat_long(postcode)
        .then((result) => {
            return get_StopPoint_stations(result[0], result[1]);
        })
        .then((stations) => {
            return Promise.all([get_data_from_station(stations[0]), get_data_from_station(stations[1])])
                .then((values) => {

                    if (values[0] === undefined && values[1] === undefined) {
                        return "No stations within 200m of this postcode.";
                    } else {
                        return values.join("");
                    }

                });
        });
}

const app = express();
app.use(express.static("frontend"));
app.use("/history", express.static("frontend/history.html"));

app.listen(3000, () => {
    console.log("Server running on port 3000.");
});

app.get("/departureBoards", (request, response) => {
    if (request.query["postcode"]) {
        postcode_to_timetable(request.query["postcode"])
            .then((message) => response.send(message))
            .catch((error) => response.status(400).send(error));
    } else {
        response.send("Please enter a postcode.");
    }
});
