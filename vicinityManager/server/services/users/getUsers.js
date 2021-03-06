// Global variables and packages
var mongoose = require('mongoose');
var userOp = require('../../models/vicinityManager').user;
var userAccountOp = require('../../models/vicinityManager').userAccount;
var logger = require("../../middlewares/logger");

// Public functions

/*
Gets user information
Receives following parameters:
- Target UID
- Requester UID and CID
*/
function getUserInfo(uid, myUid, myCid, callback) {
  var friends = [];
  var data;
  userAccountOp.findOne({_id: myCid}, {knows:1})
  .then(function(response){
    if(!response){
      callback(false, 'Wrong cid provided...');
    } else {
      getIds(response.knows, friends);
      userOp.findOne({_id:uid}, {name:1, email:1, cid:1, occupation:1, accessLevel:1, hasItems:1, hasContracts:1, 'authentication.principalRoles':1 }, function(err, response){
        data = response;
        logger.debug(response);
        if(err){
          callback(true, err);
        } else {
          if(myUid.toString() === uid.toString() || myCid.toString() === data.cid.id.toString()){
            callback(false, data);
          } else if((friends.indexOf(data.cid.id.toString()) !== -1 && data.accessLevel === 1) || data.accessLevel === 2){
            data.accessLevel = null;
            data.hasItems = null;
            data.hasContracts = null;
            data.authentication.principalRoles = null;
            callback(false, data);
          } else {
            callback(false, 'Nothing to show');
          }
        }
      });
    }
  })
  .catch(function(err){
    callback(true, err);
  });
}

function getOne(o_id, api, callback) {
  var projection;
  if(api){ projection = "name email cid accessLevel"; }
  else { projection = "-authentication.hash"; }
  userOp.findById(o_id).select(projection)
  .then(function(data){
    callback(false, data);
  })
  .catch(function(err){
    logger.debug(err);
    callback(true, err);
  });
}

function getAll(othercid, mycid, api, callback) {
  var friends = [], users = [];
  var projection;
  if(api){ projection = "name email cid occupation accessLevel"; }
  else { projection = "avatar name email occupation authentication.principalRoles location status accessLevel"; }
  userAccountOp.findById(othercid, {knows:1, 'accountOf.id':1}).populate('accountOf.id', projection)
  .then(function(response){
    var parsedData = response.toObject();
    friends = parsedData.knows !== 'undefined' ?  parsedData.knows : [];
    users = parsedData.accountOf;
    var relation = myRelationWithOther(mycid, othercid, friends);

    if(relation === 1){
      users = users.filter(function(i){return i.id.accessLevel >= 1;});
    } else if(relation === 2){
      users = users.filter(function(i){return i.id.accessLevel === 2;});
    } else {}
    callback(false, users);
  })
  .catch(function(error){
    logger.debug(error);
    callback(true, error);
  });
}

// Private functions

function myRelationWithOther(a,b,c){
  var d = [];
  getIds(c, d);
  d = d.join();
  d = d.split(',');
  if(a.toString() === b.toString()){ return 0; } // Same company
  else if(d.indexOf(a.toString()) !== -1){ return 1; } // Friend company
  else { return 2; } // Other company
}

function getIds(array, friends){
  for(var i = 0; i < array.length; i++){
    friends.push(array[i].id.toString());
  }
}

// Export functions
module.exports.getOne = getOne;
module.exports.getAll = getAll;
module.exports.getUserInfo = getUserInfo;
