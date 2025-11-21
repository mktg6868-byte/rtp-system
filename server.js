const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, "public")));

// API routes (injection later)
require("./src/api")(app);

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("RTP server running on port " + PORT));
