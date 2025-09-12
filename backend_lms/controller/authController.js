const User = require("../models/User");

async function register(req, res) {
  const { name, email, password } = req.body;
  console.log(req.body);
  if (!name || !email || !password) {
    res.json({
      message: "name, email and password are required",
      success: false,
      error: true,
    });
  }

  const user = new User({
    name,
    email,
    password,
  });

  const response = await user.save();

  res.json({
    message: "User successfully registered",
    success: true,
    error: false,
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    res.json({
      message: "email and password are required",
      success: false,
      error: true,
    });
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.json({
      message: "User does not exist.",
      success: false,
      error: true,
    });
  }

  if (user.password !== password) {
    res.json({
      message: "password entered is wrong",
      success: false,
      error: true,
    });
  }

  res.json({
    message: "login successfully",
    success: true,
    error: false,
  });
}

module.exports = { register, login };
