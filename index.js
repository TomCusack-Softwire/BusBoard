const fs = require("fs");
const request = require("request");
const express = require("express");

// get API key, if it exists
let api_key = "";
try {
    api_key = "?app_key=" + fs.readFileSync("api_key", "utf-8");
} catch (error) {
    console.error("API key file (./api_key) doesn't exist. Continuing with rate-limited anonymous mode.");
}

// set classes for responses, instead of random objects
class StopPointBus {
    constructor(lineName, destinationName, expectedArrival) {
        this.lineName = lineName;
        this.destinationName = destinationName;
        this.expectedArrival = expectedArrival;
        this.minutes = (new Date(this.expectedArrival) - new Date()) / 60000;
        this.formattedMinutes = this.minutes <= 0 ? "Due" : `${Math.ceil(this.minutes)} min${this.minutes <= 1 ? "" : "s"}`;
    }
}

class StopPointStation {
    constructor(id, commonName, distance) {
        this.id = id;
        this.commonName = commonName;
        this.distance = distance.toFixed(0);
    }
}

class Coordinate {
    constructor(latitude, longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }
}

function getJSONFromURL(url) {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (response && response.statusCode !== 200) {
                reject(`Error accessing URL: ${url.replace(/[&?]app_key=.*/g, "")}`);
            } else {
                resolve(JSON.parse(body));
            }
        });
    });
}

function formatStopPointData(station, timetable) {
    const header = `<h3 style="font-weight: normal;">
            <b><a class="no-link" title="Click to go to the TFL website for this stop." href="https://tfl.gov.uk/bus/stop/${station.id}"> ${station.commonName} </a></b>
            (${station.distance}m away)
        </h3>
    `;

    const timetableString = timetable.length === 0 ?
        "No buses are scheduled right now." :
        "<table>" + timetable.map(bus => `<tr><td>${bus.lineName}</td> <td>${bus.destinationName}</td> <td>${bus.formattedMinutes}</td></tr>`).join("") + "</table>";

    return header + timetableString;
}

function getStopPointDataFromStation(station) {
    return getJSONFromURL(`https://api.tfl.gov.uk/StopPoint/${station.id}/Arrivals${api_key}`)
        .then(json => {
            const buses = json.map(bus => new StopPointBus(bus.lineName, bus.destinationName, bus.expectedArrival));
            buses.sort((a, b) => a.minutes - b.minutes);
            return formatStopPointData(station, buses.slice(0, 5));
        });
}

function getCoordinatesFromPostcode(postcode) {
    return getJSONFromURL(`https://api.postcodes.io/postcodes/${postcode}`)
        .then(json => new Coordinate(json.result.latitude, json.result.longitude))
        .catch(error => {
            throw `Not a valid postcode: ${postcode}`;
        });
}

function getStopPointStations(coordinate) {
    return getJSONFromURL(`https://api.tfl.gov.uk/StopPoint/?lat=${coordinate.latitude}&lon=${coordinate.longitude}&stopTypes=NaptanPublicBusCoachTram&${api_key.slice(1)}`)
        .then(json => {
            const stations = json.stopPoints.map(stop => new StopPointStation(stop.id, stop.commonName, stop.distance));
            stations.sort((a, b) => a.distance - b.distance);
            return stations;
        });
}

function postcodeToTimetable(postcode) {
    return getCoordinatesFromPostcode(postcode)
        .then(coordinate => getStopPointStations(coordinate))
        .then(stations => Promise.all(stations.slice(0, 2).map(getStopPointDataFromStation))
            .then(values => values.length === 0 ? "No stations within 200m of this postcode." : values.join(""))
        );
}

const app = express();
app.use(express.static("frontend"));
app.use("/history", express.static("frontend/history.html"));

app.listen(3000, () => {
    console.log("Server running on port 3000.");
});

app.get("/departureBoards", (request, response) => {
    if (request.query.postcode) {
        postcodeToTimetable(request.query.postcode)
            .then(message => response.send(message))
            .catch(error => response.status(400).send(error));
    } else {
        response.send("Please enter a postcode.");
    }
});
