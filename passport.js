// Passport.js logic
const mongo = require('./db')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const ObjectID = require('mongodb').ObjectID
const bcrypt = require('bcrypt-nodejs')

passport.use(new LocalStrategy({
  passReqToCallback: true
}, authenticate))

passport.use("local-register", new LocalStrategy({
  passReqToCallback: true
}, register))

// Called by auth.js via passport when a user attempts to login
function authenticate(req, username, password, done) {
  mongo.db.collection("users")
    .findOne({ lcUsername: username.toLowerCase() }, {collation: {locale: "en", strength: 2}}, (err, user) => {
      if (err) {return done(err)}
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return done(null, false, { message: 'Invalid username or password.' })
      }
      return done(null, user)
    })
}

// Called by auth.js via passport when a user attempts to create a new account
function register(req, username, password, done) {
  // Password and username validation
  if (password !== req.body.password2) {
    return done(null, false, { message: 'Passwords do not match.' })
  }else if (username.length > 20) {
    return done(null, false, { message: 'Username cannot be longer than twenty characters.' })
  }else if (username.length < 3) {
    return done(null, false, { message: 'Username must be atleast three characters.' })
  }

  var date = new Date()
  // Checks if username is already in use
  mongo.db.collection('users')
    .findOne({ lcUsername: username.toLowerCase() }, {collation: {locale: "en", strength: 2}}, (err, user) => {
      if (err) {return done(err)}
      if (user) {
        console.log('username catch')
        return done(null, false, {message:'Username is already in use.'})
      }
      // Past here will only run if the username was found to be not in use
      var newUser = {
        username: req.body.username,
        lcUsername: req.body.username.toLowerCase(),
        password: bcrypt.hashSync(password),
        joinDate: date,
        img: '/images/profile.png'
      }

      // Insert the new username into the database
      mongo.db.collection('users')
        .insert(newUser, (err, result) => {
          if (err) {return done(err)}
          return done(null, result.ops[0])
        })

    })
}

// Passport serialize and deserialize functions
passport.serializeUser(function(user, done) {
  done(null, user._id.toHexString())
})

passport.deserializeUser(function(id, done) {
  mongo.db.collection('users')
    .findOne({ _id: new ObjectID.createFromHexString(id) }, (err, user) => {
      done(err, user)
    })
})
