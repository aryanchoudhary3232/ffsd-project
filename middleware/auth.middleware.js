// Authentication middleware
const isAuthenticated = (req, res, next) => {
  console.log(".........isAuthenticated");

  if (req.session.user) {

    return next();
  }

  req.flash("error_msg", "Please log in to access this resource");
  res.redirect("/login");
};

// Admin middleware
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  req.flash("error_msg", "Access denied. Admin privileges required");
  res.redirect("/dashboard");
};

// Instructor middleware
const isInstructor = (req, res, next) => {

  if (req.session.user && req.session.user.role === "instructor") {

    return next();
  }
  req.flash("error_msg", "Access denied. Instructor privileges required");
  res.redirect("/dashboard");
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isInstructor,
};
