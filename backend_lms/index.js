const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");

app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb://localhost:27017/lms")
  .then(() => console.log("mongodb connected"))
  .catch((err) => console.log("err in mongodb", err));

app.use("/auth", authRoutes);

app.listen(3000, () => {
  console.log("backend server is running on port 3000....");
});
