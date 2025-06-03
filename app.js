const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const socketio = require("socket.io");

const server = http.createServer(app);
const io = socketio(server);

// Set EJS as the view engine
app.set("view engine", "ejs");

// Set the static files directory
app.use(express.static(path.join(__dirname, "public")));

// Handle socket connections
io.on("connection", function(socket) {
    console.log("A user connected");

    socket.on("send-location", function(data) {
        io.emit("receive-location", { id: socket.id, ...data });
    });

    socket.on("disconnect", function() {
        io.emit("user-disconnected", socket.id);
    });
});

// Route for the homepage
app.get("/", function(req, res) {
    res.render("index");
});

// Start the server
server.listen(3000, () => {
    console.log("Server is listening on port 3000");
});
