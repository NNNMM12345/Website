const express = require("express");
const userRouter = express.Router();
const User = require("../models/user");

userRouter.get("/:user_id", (req, res) => {
  User.findById(req.params.user_id, (err, foundUser) => {
    if (err) {
      req.flash("error", "A database error has occurred.");
      res.redirect("back");
    } else if (!foundUser) {
      req.flash("error", "That user no longer exists.");
      res.redirect("back");
    } else {
      res.render("users/show", { foundUser });
    }
  });
});

module.exports = userRouter;
