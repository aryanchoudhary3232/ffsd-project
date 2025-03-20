const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "mySecretKey", // Change this to a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }, // 1-minute session expiry
  })
);

// Set EJS as the template engine
app.set("view engine", "ejs");

// Routes
app.get("/", (req, res) => {
  res.render("index", { user: req.session.username });
});

// Login Route
app.post("/login", (req, res) => {
  const { username } = req.body;
  if (username) {
    req.session.username = username;
    return res.redirect("/");
  }
  res.send("Please enter a username.");
});

// Logout Route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Error logging out.");
    }
    res.redirect("/");
  });
});

// Start Server
app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
