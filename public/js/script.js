const socket = io();
const map = L.map("map").setView([0, 0], 16);

L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "OpenStreetMap"
}).addTo(map);

const markers = {};
let myLocation = null;
let routingControl = null;

// Send your location
if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        myLocation = [latitude, longitude];
        socket.emit('send-location', { latitude, longitude });
    }, (error) => {
        console.error(error);
    }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    });
}

// Handle location updates
socket.on("receive-location", (data) => {
    const { id, latitude, longitude } = data;
    const userLocation = [latitude, longitude];

    if (!markers[id]) {
        markers[id] = L.marker(userLocation).addTo(map);
    } else {
        markers[id].setLatLng(userLocation);
    }

    // Draw routing only to the first "other" user
    if (myLocation && id !== socket.id) {
        if (routingControl) {
            routingControl.setWaypoints([myLocation, userLocation]);
        } else {
            routingControl = L.Routing.control({
                waypoints: [
                    L.latLng(myLocation),
                    L.latLng(userLocation)
                ],
                routeWhileDragging: false
            }).addTo(map);
        }
    }

    map.setView(userLocation); // Optional: center map
});

// Remove user marker and route when they disconnect
socket.on("user-disconnected", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];

        // If route was to this user, remove it
        if (routingControl) {
            routingControl.setWaypoints([]);
        }
    }
});
