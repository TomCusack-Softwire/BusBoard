const fs = require("fs");
const request = require("request");
const readline = require("readline-sync");

// get API key, if it exists
let api_key = "";
try {
    api_key = "?app_key=" + fs.readFileSync("api_key", "utf-8");
} catch (_) {}

function get_StopPoint_data(stop_id, callback, message="") {
    let url = "https://api.tfl.gov.uk/StopPoint/" + stop_id + "/Arrivals" + api_key;

    request(url, (error, response, body) => {
        if (response && response.statusCode !== 200) {
            console.error("Error accessing StopPoint stop.");
        } else {
            console.log("\n" + message);
            let json = JSON.parse(body);
            if (json.length > 0) {
                for (let bus of json) {
                    let minutes = (new Date(bus["expectedArrival"]) - new Date()) / 60000;
                    bus["minutesNumber"] = minutes;
                    if (minutes <= 0) {
                        bus["minutes"] = "Due";
                    } else {
                        bus["minutes"] = Math.ceil(minutes) + " minutes";
                    }
                }

                json.sort((a, b) => a["minutesNumber"] - b["minutesNumber"]);
                callback(json.slice(0, 5));
            } else {
                console.log("No buses scheduled right now.");
            }
        }
    });
}

function get_StopPoint_data_from_station(station, callback) {
    if (station === undefined) {
        return;
    }

    get_StopPoint_data(
        station["id"],
        (result) => {
            console.table(result, ["lineName", "destinationName", "minutes"]);
            callback(result);
        },
        station["commonName"] + " (" + station["id"] + ", distance: " + station["distance"].toFixed(0) + "m)"
    );
}


function get_lat_long(postcode, callback) {
    let url = "https://api.postcodes.io/postcodes/" + postcode;
    request(url, (error, response, body) => {
        let json = JSON.parse(body);
        if (json["status"] !== 200) {
            console.error(json["error"]);
        } else {
            callback(json["result"]["latitude"], json["result"]["longitude"]);
        }
    });
}

function get_StopPoint_stations(lat, long, callback) {
    let url = "https://api.tfl.gov.uk/StopPoint/?lat=" + lat + "&lon=" + long + "&stopTypes=NaptanPublicBusCoachTram&" + api_key.slice(1);
    request(url, (error, response, body) => {
        let stops = JSON.parse(body)["stopPoints"];
        stops.sort((a, b) => a["distance"] - b["distance"]);
        callback(stops);
    });
}

let stop_id = readline.question("Enter postcode: ");
get_lat_long(stop_id, (lat, long) => {
    get_StopPoint_stations(lat, long, (stations) => {
        get_StopPoint_data_from_station(stations[0], (result1) => {
            get_StopPoint_data_from_station(stations[1], (result2) => {});
        });
    });
});
