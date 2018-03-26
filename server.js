if (process.env.NODE_ENV !== "production") {
	require("dotenv").config();
}
const bodyParser = require("body-parser");
const express = require("express");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local");
const methodOverride = require("method-override");
const morgan = require("morgan");
const mongoose = require("mongoose");
const passport = require("passport");

// database === === ===
mongoose.connect(process.env.MONGODB_URI);

// models
const User = require("./models/user");

// express server
const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require("moment");

// passport auth
app.use(
	require("express-session")({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false
	})
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// routes and routers
const indexRouter = require("./routes/index");
const userRouter = require("./routes/users");

app.use((req, res, next) => {
	res.locals.user = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

app.use("/", indexRouter);
app.use("/users", userRouter);

// start the server
app.listen(process.env.PORT || 5000, process.env.IP, () => {
	console.log("Express Server has Started!");
});

// keep app awake with GET request every 5 minutes
const http = require("http");
setInterval(function() {
    http.get("http://fuskerbrothers.herokuapp.com");
}, 300000);