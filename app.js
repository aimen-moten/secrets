//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs =  require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

// const bcrypt = require("bcrypt");
// const saltRounds = 10;
// const md5 = require("md5");  -- used to hash passwords
// const encrypt = require("mongoose-encryption");  -- used to encrypt passwords

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
// mongoose.set("useCreateIndex", true);


const userSchema =  new mongoose.Schema({
    email: String,
    password: String
});

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]}); -- encryption of password
userSchema.plugin(passportLocalMongoose);


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});


app.get("/secrets", function(req, res){
    console.log("Secrets route");
    res.render("secrets");
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

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //         // password: md5(req.body.password)  //md5 will hash the password and save it to our database
    //     });
    
    //     try {
    //         newUser.save();
    //         res.render("secrets");
    //     } catch (err) {
    //         console.log(err);
    //     }
    // });
    
// });

app.post("/login", async (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if (err) { 
            console.log(err);
        } else {
            res.redirect('/secrets');
        }
      });


    // const password = md5(req.body.password);  //we are hashing the password entered by the user and checking it with the hashed password that is saved in our database
    // try {
    //     const resp = await User.findOne({email: username});
    //     bcrypt.compare(password, resp.password, function(err, result) {
    //         if (result === true){
    //             res.render("secrets");
    //         }
    //     });
        
    //     // if (resp.password === password){
    //     //     res.render("secrets");
    //     // }   --- code used when using md5
    // } catch (err) {
    //     console.log(err)
    // }
});

app.listen("3000", function(){
    console.log("Server started on port 3000");
})