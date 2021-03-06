var mongoose = require('mongoose');
var audits = require('../../services/audit/audit');
var userOp = require('../../models/vicinityManager').user;
var userAccountsOp = require('../../models/vicinityManager').userAccounts;
var logger = require("../../middlewares/logger");
var authHelper = require('../../services/login/login');
var sharingRules = require('../../services/sharingRules');
var sUpdItems = require('../../services/items/update');
var bcrypt = require('bcrypt');

//Public function

/*
Select type of update
*/
function putOne(uid, updates, userMail, userId, type, callback) {
  if(updates.hasOwnProperty('accessLevel') && type === "visibility"){
    putVisibility(uid, updates, userMail, userId, function(err, response, success){
      if(err){ callback(true, err, success); } else { callback(false, response, success); }
    });
  } else if(updates.hasOwnProperty('roles') && type === "roles"){
      putRoles(uid, updates, userMail, userId, function(err, response, success){
        if(err){ callback(true, err, success); } else { callback(false, response, success); }
      });
  } else if(updates.hasOwnProperty('newPwd') && type === "password"){
    putPassword(uid, updates, userMail, userId, function(err, response, success){
      if(err){ callback(true, err, success); } else { callback(false, response, success); }
    });
  } else if(type === "metadata"){
    putMetadata(uid, updates, userMail, userId, function(err, response, success){
      if(err){ callback(true, err, success); } else { callback(false, response, success); }
    });
  } else {
    callback(false, "Missing or wrong information, not possible to update...", false);
  }
}


// Private functions

/*
Change the user visibility
*/
function putVisibility(uid, updates, userMail, userId, callback) {
  var data = {"accessLevel": updates.accessLevel}; //Ensure only right fields sent to update
  if(Number(updates.accessLevel) < 0 || Number(updates.accessLevel) > 2){
    callback(false, "Wrong accessLevel. Valid are [0, 1, 2]", false);
  } else {
    sharingRules.changeUserAccessLevel(uid, updates.accessLevel, userMail)
    .then(function(response){
      doUpdate(uid, data, userMail, userId, function(err, response, success){
        if(err){ callback(true, err, success); } else { callback(false, response, success); }
      });
    })
    .catch(function(err){
      callback(true, err, false);
    });
  }
}

/*
Change the user Roles
*/
function putRoles(uid, updates, userMail, userId, callback) {
  var data = {}; // Initialize variable to hold actual updates
  userOp.findOne({_id: uid}, {hasItems:1, hasContracts:1, 'authentication.principalRoles':1, cid:1, email:1})
  .populate('hasItems.id', 'typeOfItem')
  .exec(function(err, response){
    if(err){
      logger.debug('err: ' + err);
      callback(true, err, false);
    } else {
      responseParsed = response.toObject();
      var cid = responseParsed.cid;
      var ownerMail = responseParsed.email;
      var things = {};
      things.contracts = (responseParsed.hasContracts.length > 0);
      things.devices = findType(responseParsed.hasItems, 'device');
      things.services = findType(responseParsed.hasItems, 'service');
      // Forbidden user roles (only web admin)
      var indexDevOps = updates.roles.indexOf('devOps');
      if(indexDevOps !== -1) updates.roles.splice(indexDevOps, 1);
      var indexSU = updates.roles.indexOf('superUser');
      if(indexSU !== -1) updates.roles.splice(indexSU, 1);
      // Complete update payload -- Check if something is missing
      if(responseParsed.authentication.principalRoles.indexOf('devOps') !== -1){
        updates.roles.push('devOps'); // If it is devOps keep status
      }
      if(responseParsed.authentication.principalRoles.indexOf('superUser') !== -1){
        updates.roles.push('superUser'); // If it is superUser keep status
      }
      if(updates.roles.indexOf('user') === -1){
        updates.roles.push('user'); // User has to be always a role
      }
      var data = {"authentication.principalRoles": updates.roles}; //Ensure only right fields sent to update

      var canServices = updates.roles.indexOf('service provider') !== -1;
      var canDevs = updates.roles.indexOf('device owner') !== -1;
      var canContracts = updates.roles.indexOf('infrastructure operator') !== -1;
      var couldServices = responseParsed.authentication.principalRoles.indexOf('service provider') !== -1;
      var couldDevs = responseParsed.authentication.principalRoles.indexOf('device owner') !== -1;
      var couldContracts = responseParsed.authentication.principalRoles.indexOf('infrastructure operator') !== -1;
      var stopServices = (couldServices && !canServices && things.services); // Losing service provider role and still having services
      var stopDevices = (couldDevs && !canDevs && things.devices); // Losing device owner role and still having devices
      var stopContracts = (couldContracts && !canContracts && things.contracts); // Losing infrastructure operator role and still having contracts
      var willAdmin = updates.roles.indexOf('administrator') !== -1;
      var isAdmin = responseParsed.authentication.principalRoles.indexOf('administrator') !== -1;
      var canChange = true;

      if(willAdmin !== isAdmin){ canChange = ownerMail !== userMail; } // Only a different admin can modify my admin role

      var invalidRoles = checkRoles(updates.roles);

      if(!canChange){
        callback(false, 'Only a different administrator can modify your administrator role', false);
      } else if(invalidRoles.invalid){
        callback(false, invalidRoles.message + ' is an invalid role...', false);
      } else if( stopServices || stopDevices || stopContracts ){
        var msg = "User cannot change roles, please remove its:";
        if(stopDevices) msg = msg + " devices";
        if(stopServices) msg = msg + " services";
        if(stopContracts) msg = msg + " contracts";
        callback(false, msg, false);
      } else {
        doUpdate(uid, data, userMail, userId, function(err, response, success){
          if(err){ callback(true, err, success); } else { callback(false, response, success); }
        });
      }
    }
  });
}

/*
Change the user Metadata
*/
function putMetadata(uid, updates, userMail, userId, callback) {
  var data = {};
  var updCount = 0;
  if(updates.hasOwnProperty('occupation')) {
    data.occupation = updates.occupation;
    updCount += 1;
  }
  if(updates.hasOwnProperty('name')) {
    data.name = updates.name;
    updCount += 1;
  }
  if(updates.hasOwnProperty('avatar')) {
    data.avatar = updates.avatar;
    updCount += 1;
  }
  if(updates.hasOwnProperty('contactMail')) {
    data.contactMail = updates.contactMail;
    updCount += 1;
  }
  if(updCount > 0){
    doUpdate(uid, data, userMail, userId, function(err, response, success){
      if(err){ callback(true, err, success); } else { callback(false, response, success); }
    });
  } else {
    callback(false, "Missing or wrong information, not possible to update...", false);
  }
}

/*
Change the user password
*/
function putPassword(uid, updates, userMail, userId, callback){
  var hash = "";
  var oldPwd = updates.oldPwd;
  var newPwd = updates.newPwd;
  userOp.findOne({_id:uid},{authentication:1})
  .then(function(response){
    hash = response.authentication.hash;
    return bcrypt.compare(oldPwd, hash); // True if valid pwd
  })
  .then(function(response){
    if(response){
      authHelper.updatePwd(uid, newPwd, function(err, response){
        logger.audit({user: userMail, action: 'updatePassword', item: uid });
        callback(false, response, true);
      });
    } else {
      callback(false, "Wrong password", false);
    }
  })
  .catch(function(err){
    callback(true, err, false);
  });
}

/*
Actual NM storage update
*/
function doUpdate(uid, updates, userMail, userId, callback){
  var updItem;
  userOp.findOneAndUpdate( { "_id": uid}, {$set: updates}, {new: true})
  .then(function(response){
    updItem = response;
    return audits.create(
      { kind: 'user', item: userId , extid: userMail },
      { kind: 'userAccount', item: response.cid.id, extid: response.cid.extid },
      { kind: 'user', item: response._id, extid: response.email },
      13, null);
  })
  .then(function(response){
    logger.audit({user: userMail, action: 'updateUser', item: uid });
    callback(false, updItem, true); })
  .catch(function(err){
    logger.error({user: userMail, action: 'updateUser', item: uid, message: err });
    callback(true, err, false);
  });
}

/*
Check if there are devices and/or services
*/
function findType(items, type){
  for(var i = 0, l = items.length; i < l; i++){
    if(items[i].id.typeOfItem === type){
      return true;
    }
  }
  return false;
}

/*
Validates Roles
If role does not exist throw error message
*/
function checkRoles(roles){
  var possibleRoles =  ["service provider", "device owner", "infrastructure operator", "administrator", "system integrator", "devOps", "user", "superUser"];
  for(var i = 0, l = roles.length; i < l; i++){
    if(possibleRoles.indexOf(roles[i]) === -1){
      return {invalid: true, message: roles[i]};
    }
  }
  return {invalid: false, message: null};
}

// Export modules
module.exports.putOne = putOne;
