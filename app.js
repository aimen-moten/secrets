//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs =  require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;
// const md5 = require("md5");  -- used to hash passwords
// const encrypt = require("mongoose-encryption");  -- used to encrypt passwords

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema =  new mongoose.Schema({
    email: String,
    password: String
});


// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]}); -- encryption of password


const User = new mongoose.model("User", userSchema);


app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.post("/register", function(req, res){
    
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash
            // password: md5(req.body.password)  //md5 will hash the password and save it to our database
        });
    
        try {
            newUser.save();
            res.render("secrets");
        } catch (err) {
            console.log(err);
        }
    });
    
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    // const password = md5(req.body.password);  //we are hashing the password entered by the user and checking it with the hashed password that is saved in our database
    try {
        const resp = await User.findOne({email: username});
        bcrypt.compare(password, resp.password, function(err, result) {
            if (result === true){
                res.render("secrets");
            }
        });
        
        // if (resp.password === password){
        //     res.render("secrets");
        // }   --- code used when using md5
    } catch (err) {
        console.log(err)
    }

});

app.listen("3000", function(){
    console.log("Server started on port 3000");
})