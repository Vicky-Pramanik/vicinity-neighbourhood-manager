var mongoose = require('mongoose');
var userOp = require('../../models/vicinityManager').user;
var rememberOp = require('../../models/vicinityManager').remember;
var userAccountsOp = require('../../models/vicinityManager').userAccount;
var jwt = require('../../services/jwtHelper');
var logger = require("../../middlewares/logger");
var mailing = require('../../services/mail/mailing');
var bcrypt = require('bcrypt');

/*
Check user and password
*/
function authenticate(userName, userRegex, pwd, callback) {
  var myUser = {};
  var hash = "";
  var o_id = "";

  if(userName && pwd){
    userOp.find({ email: { $regex: userRegex } }, {_id:1, email:1, authentication:1})
    .then(function(response){
        if (!response || response.length !== 1){
        callback(true, "User not found");
      } else {
        myUser = response[0];
        hash = myUser.authentication.hash;
        bcrypt.compare(pwd, hash)
        .then(function(response){
          if ((userName.toLowerCase() === myUser.email.toLowerCase()) && response){
            o_id = mongoose.Types.ObjectId(myUser._id);
            userAccountsOp.find({ accountOf: {$elemMatch: { id: o_id }}}, {_id:1, cid:1}, function(err, response){
              var credentials = jwt.jwtEncode(myUser._id, userName, myUser.authentication.principalRoles, response[0]._id, response[0].cid);
              callback(false, credentials, {uid: myUser._id, cid: response[0]._id });
              logger.audit({user: userName, action: 'login'});
            });
          } else {
            logger.warn({user: userName, action: 'login', message: 'Wrong password'});
            callback(true, "Wrong password");
          }
        })
        .catch(function(err){
          logger.debug(err);
          callback(true, err);
        });
      }
    })
    .catch(function(err){
      logger.debug(err);
      callback(true, err);
    });
   } else {
    logger.warn({user: userName, action: 'login', message: 'Missing fields'});
    callback(true, "Missing email or password");
  }
}

/*
Stores cookie in MONGO for the Remember Me functionality
*/
function rememberCookie(token, callback) {
  var db = new rememberOp();
  db.token = token;
  db.save(function(err,data){
    if(err){
      callback(true, err);
    }else{
      callback(false, data);
    }
  });
}

/*
Recover password - Sends link to the provided mail
The link provided redirects to updatePwd function in this same module
*/
function findMail(userName, callback){
  userOp.findOne({ email: userName })
  .then(function(result){
    var mailInfo = {
      link : "http://vicinity.bavenir.eu/#/authentication/recoverPassword/" + result._id,
      emailTo : result.email,
      subject : 'Password recovery email VICINITY',
      tmpName :'recoverPwd',
      name : result.name
    };
    return mailing.sendMail(mailInfo);
  })
  .then(function(response){
    callback(false, response);
  })
  .catch(function(err){
    callback(true, err);
  });
}

/*
Updates user password/hash
*/
function updatePwd(id, pwd, callback) {
  var o_id = mongoose.Types.ObjectId(id);
  var saltRounds = 10;
  var salt = "";
  var hash = "";

  bcrypt.genSalt(saltRounds)
  .then(function(response){
    salt = response.toString('hex');
    return bcrypt.hash(pwd, salt);
  })
  .then(function(response){
    // Store hash in your password DB.
    hash = response;
    var updates = {'authentication.hash': hash}; // Stores salt & hash in the hash field
    return userOp.update({ "_id": o_id}, {$set: updates});
  })
  .then(function(response){
    callback(false, response);
  })
  .catch(function(err){
    logger.debug(err);
    callback(true, err);
  });
}

/*
Updates rememberMe cookie in browser
*/
function updateCookie(o_id_cookie, token, updates, callback) {
  var decoded = jwt.jwtDecode(token);
  var o_id_user = mongoose.Types.ObjectId(decoded.uid);
  userOp.findById(o_id_user, function(err, dataUser){  // Load roles from user collection because they may change during a session
    var newToken = jwt.jwtEncode(decoded.uid, dataUser.email, dataUser.authentication.principalRoles, decoded.orgid, decoded.cid);
    updates.token = newToken.token;
    rememberOp.findByIdAndUpdate(o_id_cookie, {$set: updates}, { new: true }, function(err, data){
      if(!err){
        callback(false, data);
      } else {
        callback(true, err);
      }
    });
  });
}

// Export functions

module.exports.authenticate = authenticate;
module.exports.findMail = findMail;
module.exports.rememberCookie = rememberCookie;
module.exports.updatePwd = updatePwd;
module.exports.updateCookie = updateCookie;
