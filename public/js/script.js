const socket = io();
const map = L.map("map").setView([0, 0], 16);

// Secure HTTPS for tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
}).addTo(map);

const markers = {};
let myLocation = null;
let routingControl = null;
let mySocketId = null;

// Get and store socket ID safely
socket.on("connect", () => {
    mySocketId = socket.id;
});

// Send your location continuously
if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        myLocation = [latitude, longitude];
        socket.emit('send-location', { latitude, longitude });

        // Add or update your own marker
        if (!markers["me"]) {
            markers["me"] = L.marker(myLocation, { title: "You" }).addTo(map);
        } else {
            markers["me"].setLatLng(myLocation);
        }

        // Center map on your location only once
        if (!map._centered) {
            map.setView(myLocation, 16);
            map._centered = true;
        }

    }, (error) => {
        console.error("Geolocation error:", error);
    }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    });
} else {
    console.error("Geolocation not supported.");
}

// Receive other users' locations
socket.on("receive-location", (data) => {
    const { id, latitude, longitude } = data;
    const userLocation = [latitude, longitude];

    if (!markers[id]) {
        markers[id] = L.marker(userLocation, { title: `User ${id}` }).addTo(map);
    } else {
        markers[id].setLatLng(userLocation);
    }

    // Only show route to one other user
    if (myLocation && id !== mySocketId) {
        if (routingControl) {
            routingControl.setWaypoints([myLocation, userLocation]);
        } else {
            routingControl = L.Routing.control({
                waypoints: [L.latLng(myLocation), L.latLng(userLocation)],
                routeWhileDragging: false,
                draggableWaypoints: false,
                createMarker: () => null // Optional: hide route markers
            }).addTo(map);
        }
    }
});

// Handle disconnection of a user
socket.on("user-disconnected", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];

        // Remove route if it's for this user
        if (routingControl) {
            routingControl.setWaypoints([]);
        }
    }
});

// Optional: log socket errors
socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err);
});
