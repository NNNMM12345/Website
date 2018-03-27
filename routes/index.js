const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const async = require("async");
const crypto = require("crypto");

// GET ROUTES
router.get("/", (req, res) => {
  res.render("landing", { page: "landing" });
});

// show the register form
router.get("/register", (req, res) => {
  res.render("register", { page: "register" });
});

// show the login form
router.get("/login", (req, res) => {
  res.render("login", { page: "login" });
});

// show the logout form
router.get("/logout", (req, res) => {
  req.logout();
  req.flash("success", "You have been logged out.");
  res.redirect("/");
});

router.get("/forgot", (req, res) => {
  res.render("forgot", { page: "forogot " });
});

router.get("/reset/:token", (req, res) => {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    },
    (err, user) => {
      if (!user) {
        req.flash("error", "Password reset token is invalid or has expired.");
        res.redirect("/forgot");
      } else {
        res.render("reset", { page: "reset", token: req.params.token });
      }
    }
  );
});

// POST ROUTES
// create a new user, add them to the database, and authenticate them
router.post("/register", (req, res) => {
  const user = new User({
    username: req.body.username,
    email: req.body.email
  });
  User.register(user, req.body.password, (err, newUser) => {
    if (err) {
      req.flash("error", err.message);
      return res.redirect("register");
    }
    passport.authenticate("local")(req, res, () => {
      req.flash("success", `Welcome to FuskerBrothers, ${newUser.username}!`);
      const smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });
      const mailOptions = {
        to: user.email,
        from: process.env.GMAIL_USER,
        subject: "Welcome to FuskerBrothers!",
        text:
          "Hi " +
          newUser.username +
          "," +
          "\n\n" +
          "Thanks for signing up for FuskerBrothers!"
      };
      smtpTransport.sendMail(mailOptions, err => {
        done(err, "done");
      });
      res.redirect("/");
    });
  });
});

// log a user in
router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
  }),
  (req, res) => {
    req.flash("success", `Welcome back, ${req.user.username}!`);
    res.redirect("/");
  }
);

router.post("/forgot", async (req, res) => {
  async.waterfall(
    [
      done => {
        crypto.randomBytes(20, (err, buf) => {
          const token = buf.toString("hex");
          done(err, token);
        });
      },
      (token, done) => {
        User.findOne({ email: req.body.email }, (err, user) => {
          if (err) {
            req.flash("error", "An error occurred while finding the user.");
            res.redirect("back");
          } else if (!user) {
            req.flash(
              "error",
              "A user with that email address could not be found."
            );
            res.redirect("back");
          } else {
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000;
            user.save(err => {
              done(err, token, user);
            });
          }
        });
      },
      (token, user, done) => {
        const smtpTransport = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
          }
        });
        const mailOptions = {
          to: user.email,
          from: process.env.GMAIL_USER,
          subject: "FuskerBrothers Password Reset Request",
          text: `https://${req.headers.host}/reset/${token}`
        };
        smtpTransport.sendMail(mailOptions, err => {
          req.flash(
            "success",
            "Please check your email for password reset instructions."
          );
          done(err, "done");
        });
      }
    ],
    err => {
      if (err) {
        next(err);
      } else {
        res.redirect("/forgot");
      }
    }
  );
});

router.post("/reset/:token", (req, res) => {
  async.waterfall(
    [
      done => {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
          },
          (err, user) => {
            if (err) {
              req.flash("error", "There was an error finding the user.");
              return res.redirect("/forgot");
            } else if (!user) {
              req.flash("error", "Password reset token invalid or expired.");
              return res.redirect("/forgot");
            } else if (req.body.password === req.body.confirm) {
              user.setPassword(req.body.password, err => {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                user.save(err => {
                  req.logIn(user, err => {
                    done(err, user);
                  });
                });
              });
            } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect("back");
            }
          }
        );
      },
      (user, done) => {
        const smtpTransport = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
          }
        });
        const mailOptions = {
          to: user.email,
          from: process.env.GMAIL_USER,
          subject: "FuskerBrothers Password Reset Confirmation",
          text: `FuskerBrothers password for ${user.email} has been changed.`
        };
        smtpTransport.sendMail(mailOptions, err => {
          req.flash("success", "Your password has been reset!");
          done(err);
        });
      }
    ],
    err => {
      if (err) {
        req.flash("error", "there was an error!");
        res.redirect("back");
      } else {
        res.redirect("/");
      }
    }
  );
});

module.exports = router;
