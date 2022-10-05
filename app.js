require('dotenv').config();
const express = require('express');
const app = express();
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');
// using mongoose-encryption
// const encrypt = require('mongoose-encryption');

// using hashing functions which cant be truned back into original strings (kind of impossible)
// const md5 = require('md5');

// using bcrypt
// const bcrypt = require('bcrypt');
// const saltRounds = 10;

// using passport
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

// using google oauth with passport
const GoogleStrategy = require('passport-google-oauth20').Strategy;


// middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');

// this is for using sessions together with cookies
app.use(session({
    secret: 'this is a long string of my choosing.',
    resave: false,
    saveUninitialized: false
}))
// this is to initialize passport to setup and work for us
app.use(passport.initialize());
// this is to use passport to deal with the sessions
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/udemy-authentication", { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

// this will be used to hash and salt the passwords and save the users to the database
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// using mongoose-encryption -- which will just convert things to encrypted and decrypts the encrypted string just like that without
// the use of any other function
// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:['password']});

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// serialising user is like making the cookies with whatever information u want and sending it to the browser for a good user experience
// passport.deserializeUser(User.deserializeUser());
// deserialising user is like breakng the cookies to get the information from the users cookies to authenticate or whatever

passport.serializeUser((user,done)=>{
    done(null,user.id);
})
passport.deserializeUser((id,done)=>{
    User.findById(id,(err,user)=>{
        done(err,user)
    })
})

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


// routes
app.get('/', (req, res) => {
    res.render('home');
})

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    }
);

app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile']
    })
);

app.get('/login', (req, res) => {
    res.render('login');
})

app.get('/register', (req, res) => {

    res.render('register');
})

v=["Jack Baeuer is my hero"];
app.get('/secrets', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('secrets',{views:v});
    }
    else {
        res.redirect('/login');
    }
})

app.get('/submit',(req,res)=>{
    res.render('submit');
})

app.post('/submit-secret',(req,res)=>{
    const txt = req.body.secret;
    v.push(txt);
    res.redirect('/secrets');
})

app.post('/register', (req, res) => {

    User.register({ username: req.body.username }, req.body.password, (err, save) => {
        if (err) {
            console.log(err);
            res.redirect('/register');
        }
        else {
            passport.authenticate("local")(req, res, () => {
                res.redirect('/secrets');
            })
        }
    })

    // const email = req.body.username;
    // const pwd = req.body.password;
    // bcrypt.hash(pwd,saltRounds,(err,hashedpwd)=>{
    //     const newUser = new User({
    //         email:email,
    //         password:hashedpwd
    //     });
    //     newUser.save((err)=>{
    //         if(err) console.log(err);
    //         else res.render('secrets');
    //     })
    // })

})

app.post('/login', async (req, res) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (err) => {
        if (err) {
            console.log(err);
        }
        else {
            // this method will authenticate the user by sending the cookie and asking the browser to hold on to that cookie until 
            // user logs out or the browser closes(which is the default time limit for any cookie without any other values set)
            passport.authenticate("local")(req, res, function () {
                res.redirect('/secrets');
            })
        }
    })


    // const email = req.body.username;
    // const pwd = req.body.password;

    // const d = await User.findOne({email:email}).exec();
    // if(d)
    // {
    //     bcrypt.compare(pwd,d.password,(err,result)=>{
    //         if(result===true)
    //         {
    //             res.render('secrets');
    //         }
    //         else
    //         {
    //             console.log('wrong password');
    //         }
    //     })
    // }
    // else
    // {
    //     console.log('user doesnt exist');
    // }

})

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.log(err);
        else {
            res.redirect('/');
        }
    });
})


app.listen(3000||process.env.PORT, () => {
    console.log('server started');
})
