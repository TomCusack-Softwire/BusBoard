const fs = require("fs");
const request = require("request");
const readline = require("readline-sync");

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
                        } else {
                            bus["minutes"] = Math.ceil(minutes) + " minutes";
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

function print_data_from_station(station) {
    if (station === undefined) {
        return;
    }

    get_StopPoint_data(station["id"])
        .then((timetable) => {
            console.log();
            console.log(station["commonName"] + " (" + station["id"] + ", distance: " + station["distance"].toFixed(0) + "m)");
            console.table(timetable, ["lineName", "destinationName", "minutes"]);
        })
        .catch(console.error);
}

function postcode_to_timetable(postcode) {
    get_lat_long(postcode)
        .then((result) => {
            return get_StopPoint_stations(result[0], result[1]);
        })
        .then((stations) => {
            print_data_from_station(stations[0]);
            return stations;
        })
        .then((stations) => {
            print_data_from_station(stations[1]);
        })
        .catch(console.error);
}

function main() {
    let postcode = readline.question("Enter postcode: ");
    postcode_to_timetable(postcode);
}

main();