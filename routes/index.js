var express = require('express');
var router = express.Router();
var cons = require('consolidate');
var jwt = require('jsonwebtoken');
var fs = require('fs');


var secret = "Celestial Inquisition";

var User = require('../models/user');

var levels = require('../config/levels');

var isAuthenticated = function(req, res, next) {
  if (req.user) {
    next()
  } else {
    res.redirect('/login');
  }
}

function signinSSO(req, res, next) {
    if (req.query.token) {
        jwt.verify(req.query.token, tokenSecret, (err, decoded)=>{
            if (!err) {
                var user = decoded.user;
                req.session.regenerate(function () {
                    req.user = user;
                    req.session.userId = user._id;
                    // if the user has a password set, store a persistence cookie to resume sessions
                    if (keystone.get('cookie signin') && user.password) {
                        var userToken = user._id + ':' + hash(user.password);
                        var cookieOpts = _.defaults({}, keystone.get('cookie signin options'), {
                            signed: true,
                            httpOnly: true,
                            maxAge: 10 * 24 * 60 * 60,
                        });
                        res.cookie('keystone.uid', userToken, cookieOpts);
                        console.log(userToken);
                    }
                    return next();
                });
            }
            else next();
        });
    }
    else next();
};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/leaderboard', function(req, res, next) {
  User.find({}).sort([['level', -1], ['updatedAt', 1]]).exec(function(err, users) {
    res.render('leaderboard', {users: users});
  })
});

router.get('/ripsteve', function(req, res, next) {
  User.find({}).exec(function(err, users) {
    res.render('contact', {users: users});
  })
});

router.get('/verified', function(req, res, next) {
  res.render('verified');
});

router.get('/login', function(req, res, next) {
  if (req.user) {
    res.redirect('/profile');
  } else {
    res.render('login');
  }
});

router.get('/profile', isAuthenticated, function(req, res, next) {
  res.render('profile', {uname: req.user.uname})
});

router.get('/verify/:token', function(req, res, next) {
  jwt.verify(req.params.token, secret, function(err, decoded) {
    if (decoded) {
      User.update(decoded, {
        verified: true
      }, function(err, user, n) {
        console.log(err, user, n)
      })
      res.redirect("/profile");
    } else {
      res.redirect("/");
    }
  });
});

router.post('/uname', isAuthenticated, function(req, res, next) {
  console.log(req.body)
  if (!req.body.uname) {
    req.session.wronguname = true
    res.redirect('/profile')
  } else {
    User.findOne({uname: req.body.uname}, function(err, user) {
      if (user) {
        req.session.wronguname = true
        res.redirect('/profile')
      } else {
        User.findOne({emailId: req.user.emailId}, function(err, user) {
          user.uname = req.body.uname;
          user.save(function(err) {
            res.redirect('/profile')
          })
        })
      }
    })
  }
});

router.get('/play', isAuthenticated, function(req, res, next) {
  if (!req.user.uname) {
    req.session.wronguname = true
    res.redirect('/profile')
  } else {
    User.findById(req.user.id, function(err, user) {
      var l = user.level;
      res.render('levels/' + levels[l].file, {level: levels[l]})
    });
  }
});

router.post('/ans', isAuthenticated, function(req, res, next) {
  if (!req.user.uname) {
    req.session.wronguname = true
    res.redirect('/profile')
  } else {
    User.findById(req.user.id, function(err, user) {
      var l = user.level;
      if (req.body && req.body.answer && (levels[l].answer == req.body.answer.toLowerCase())) {
        user.level = l+1;
        user.save(function() {
          res.render('levels/success');
        })
      } else {
        if (req.body && req.body.answer) {
          fs.appendFile('level'+user.level+'.txt', req.body.answer+'\n', function(err){})
        }
        res.render('levels/failure');
      }
    })
  }
});

router.get('/test', function(req, res, next) {
  res.render('levels/victory');
});

module.exports = router;