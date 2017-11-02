// Global Objects

var mongoose = require('mongoose');
var logger = require('../../middlewares/logger');
var commServer = require('../../helpers/commServer/request');
var myItems = require('../../helpers/items/deleteItems');
var nodeOp = require('../../models/vicinityManager').node;
var userAccountOp = require('../../models/vicinityManager').userAccount;
var sync = require('../../helpers/asyncHandler/sync');

// Public functions

/*
Change node status to deleted in MONGO
Remove node from commServer
Remove all oids under node from commServer AND MONGO
*/
function deleteNode(adids){

  return new Promise(function(resolve, reject) {
    if(adids.length > 0){ // Check if there is any item to delete
      logger.debug('Start async handler...' + adids);
      sync.forEachAll(adids,
        function(value, allresult, next) {
          deletingNodes(value, function(value, result) {
              logger.debug('END execution with value =', value, 'and result =', result);
              allresult.push({value: value, result: result});
              next();
          });
        },
        function(allresult) {
          if(allresult.length === adids.length){
            logger.debug('Completed async handler: ' + JSON.stringify(allresult));
            resolve({"error": false, "message": allresult });
          }
        },
        false
      );
    } else {
      resolve({"error": false, "message": "Nothing to be removed..."});
    }
  });
}

/*
On node saved successfully in MONGO,
the update process continues in the commServer
*/
  function updateNode(data){
    return new Promise(function(resolve, reject) {
      var payload = {
        name: data.name,
        password: data.pass,
      };
      commServer.callCommServer(payload, 'users/' + data.adid, 'PUT') // Update node in commServer
      .then(
        function(response){
          var payload2 = {
            name: data.adid,
            description: data.name
          };
          return commServer.callCommServer(payload2, 'groups/' + data.adid, 'PUT');
        })
        .then(function(response){ resolve('Success'); })
        .catch(function(err){ reject(err); });
      });
  }

// Private Functions

/*
Deletes all node asynchronously
*/
function deletingNodes(adid, callback){
  var aux = {};
      commServer.callCommServer({}, 'users/' + adid, 'DELETE') // Update node in commServer
      .then( function(response){ return commServer.callCommServer({}, 'groups/' + adid, 'DELETE');})
      .then(
        function(response){
              var query = {
                'status': 'deleted',
                'name': 'empty'
              };
              return nodeOp.findOneAndUpdate({adid: adid}, { $set: query }, { new: true }); })
      .then(
        function(response){
              aux = response;
              return userAccountOp.update({_id: aux.organisation}, {$pull: {hasNodes: adid}}); })
      .then(function(response){ return myItems.deleteItems(aux.hasItems); })
      .then(function(response){callback(adid, {'status':'success', 'items': response}) ;})
      .catch(function(err){callback(adid, 'error');});
}

/*
Callback default response for errors
*/
function errorCallback(error){
  logger.debug({"error": true, "message": "Something went wrong: " + error.statusCode});
}

// Export Functions

module.exports.deleteNode = deleteNode;
module.exports.updateNode = updateNode;
