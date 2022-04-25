const fs = require("fs");
const request = require("request");
const readline = require("readline-sync");

// get API key, if it exists
let api_key = "";
try {
    api_key = "?app_key=" + fs.readFileSync("api_key", "utf-8");
} catch (_) {}

let user_input = readline.question("Enter stop ID: ");
let url = "https://api.tfl.gov.uk/StopPoint/" + user_input + "/Arrivals" + api_key;

request(url, (error, response, body) => {
    let code = response && response.statusCode;

    if (code === 404) {
        console.log("Incorrect stop ID.");
    } else {
        let result = JSON.parse(body);
        for (let bus of result) {
            let minutes = (new Date(bus["expectedArrival"]) - new Date()) / 60000;
            bus["minutesNumber"] = minutes;
            if (minutes <= 0) {
                bus["minutes"] = "Due";
            } else {
                bus["minutes"] = Math.ceil(minutes) + " minutes";
            }
        }
        result.sort((a, b) => a["minutesNumber"] - b["minutesNumber"]);
        console.table(result.slice(0, 5), ["lineName", "destinationName", "minutes"]);
    }
});