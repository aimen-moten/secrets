//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs =  require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook");


const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

//configure session
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

//configure passport
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema =  new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: Array
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    try {
      async function find() {
        const user = await User.findById(id);
        done(null, user);
      }
      find().catch(err => done(err)); // handle any errors that occur
    } catch (err){
      console.log(err);
      done(err);
    }
  });


passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
}, function(accessToken, refreshToken, profile, cb){
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
));

app.get('/auth/facebook',
  passport.authenticate('facebook'));


app.get('/auth/facebook/secrets', function(req, res, next) {
    passport.authenticate('facebook', function(err, user, info) {
        res.render("secrets");
    })(req, res, next);
});


 
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile); 
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/", function(req, res){
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});


app.get("/secrets", async (req, res) => {
    try {
        const resp = await User.find({"secret": {$ne: null}});
        console.log(resp);
        res.render("secrets", {usersWithSecrets: resp});
    } catch (err) {
        console.log(err);
    }

});


app.get('/logout', function(req, res, next){
    req.session.destroy();
    res.redirect("/");
  });

app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user) {
        if (err) { 
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate('local', { failureRedirect: '/login', failureMessage: true })(req, res, function() {
                console.log("I have been authenticated");
                res.redirect("/secrets");
            });
        }
    });
});


// app.post("/login", async (req, res) => {
//     const user = new User({
//         username: req.body.username,
//         password: req.body.password
//     });

//     req.login(user, function(err) {
//         if (err) { 
//             console.log(err);
//         } else {
//             res.redirect('/secrets');
//         }
//       });
// });

app.post("/login", passport.authenticate("local", {
  successRedirect: "/secrets",
  failureRedirect: "/login"
}));

app.get('/submit', async (req, res) => {
  console.log(req.isAuthenticated())
  if (req.isAuthenticated()) {
    // Find the current user by their ID
    try {
      const resp = await User.findById(req.user._id);
      res.render("submit", { secret: resp.secret });
    } catch (err) {
      console.log(err);
    }
  }
  else {
    res.redirect("/login");
  }
});


app.post("/submit/delete", async(req, res)=>{
  if (req.isAuthenticated()){
    try {
      const foundUser = await User.findById(req.user.id);
      const secretIndex = foundUser.secret.findIndex(findSecret);
      console.log(req.body.secret);
      function findSecret(everySecret) {
        // console.log(everySecret);
        return everySecret === req.body.secret;
      }
      foundUser.secret.splice(secretIndex, 1);
      console.log(foundUser.secret);
      foundUser.save();
      res.redirect("/submit");
      // console.log(secretIndex)
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login");
  }
});

// app.post("/submit/delete", async (req, res) => {
//   if (req.isAuthenticated()) {
//     try {
//       const foundUser = await User.findById(req.user.id);
//       console.log(foundUser);
//       // console.log(req.foundUser.secrets);
//       const secretIndex = foundUser.secrets.findIndex((secret) => secret._id === req.foundUser.secret);
//       // console.log(secret);
//       console.log(secretIndex);
//       if (secretIndex !== -1) {
//         foundUser.secret.splice(secretIndex, 1);
//         console.log(foundUser.secret);
//         foundUser.save();
//       }
//       res.redirect("/submit");
//     } catch (err) {
//       console.log(err);
//     }
//   } else {
//     res.redirect("/login");
//   }
// });


  
app.post("/submit", async (req, res) => {
    const submittedSecret = req.body.secret;
    try {
        const foundUser = await User.findById(req.user.id);
        foundUser.secret.push(submittedSecret);
        foundUser.save();
        res.redirect("/secrets");
    } catch (err) {
        console.log(err);
    }
});
app.listen("3000", function(){
    console.log("Server started on port 3000");
})