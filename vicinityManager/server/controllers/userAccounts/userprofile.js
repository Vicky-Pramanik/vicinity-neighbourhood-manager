/**
 * First version by viktor on 31.03.16.
 * Last version Jorge 03.11.17.
 */

var mongoose = require('mongoose');
var userAccountOp = require('../../models/vicinityManager').userAccount;
var logger = require("../../middlewares/logger");

/*
Get all organisations meeting the  user request (All, friends, no friends)
*/
function getAllFilteredUserAccountsFacade(req, res, next) {

  var response = {};
  var o_id = mongoose.Types.ObjectId(req.params.id);
  var type = req.query.type;

  if(Number(type) === 0){
    userAccountOp.find({status: { $not: /^del.*/} }) // if the field status exists, is also equal to deleted
    .then( function(data) { res.json({"error": false, "message": data}); })
    .catch( function(err) { res.json({"error": true, "message": "Error fetching data"}); });
  } else {
    userAccountOp.findById(o_id, {knows: 1})
    .then( function(data){
      var parsedData = data.toObject();
      var qry;
      var friends = [];
      if(parsedData){
        getIds(parsedData.knows, friends);
      }
      // friends = friends.join();
      // friends = friends.split(',');
      if(Number(type) === 1){ qry = {_id: {$in: friends}, status: { $not: /^del.*/} }; }
      else { qry = {_id: {$not: {$in: friends} }, status: { $not: /^del.*/} }; }
      return userAccountOp.find(qry); // if the field status exists, is also equal to deleted
    })
    .then( function(data){res.json({"error": false, "message": data});})
    .catch( function(err){res.json({"error": true, "message": "Error fetching data"});});
  }
}

/*
Update
*/
function updateUserAccountFacade(req, res, next){
    var response = {};
    var o_id = mongoose.Types.ObjectId(req.params.id);
    var updates = req.body;
    userAccountOp.update({ "_id": o_id}, updates, function(err, raw){
      response = {"error": err, "message": raw};
      res.json(response);
    });
}

/*
Get one user account -- Checks status against other userAccounts (Friendship)
*/
function getUserAccountFacade(req, res, next) {
    var response = {};
    var o_id = mongoose.Types.ObjectId(req.params.id);
    var isNeighbour = false;
    var canSendNeighbourRequest = true;
    var canCancelNeighbourRequest = false;
    var canAnswerNeighbourRequest = false;
    //TODO: Issue #6 Update userAcount profile wheather the autenticated user is friend with :id
    //TODO: Remove foreing users;

      userAccountOp.findById(o_id).populate('knows.id').populate('accountOf.id', 'avatar name email occupation location status accessLevel').exec(function (err, data) {

        if (!data ) {
          logger.debug('There is no data!!!');
          res.status(404).send('Not found');
        } else {
          if (err) {
              response = {"error": true, "message": "Error fetching data"};
          } else {
            var parsedData = data.toObject();
            var myNeighbors = parsedData.knows;
            var requestsFrom = parsedData.knowsRequestsFrom;
            var requestTo = parsedData.knowsRequestsTo;

              if (req.params.id === req.body.decoded_token.orgid){
                  isNeighbour = false;
                  canSendNeighbourRequest = false;
                  canCancelNeighbourRequest = false;
                  canAnswerNeighbourRequest = false;

              } else {
                  // Check wheather we are neihbours
                  for(var index = 0; index < myNeighbors.length; index++){
                      if (myNeighbors[index].id._id.toString() === req.body.decoded_token.orgid.toString()) {
                          isNeighbour = true;
                          canSendNeighbourRequest = false;
                      }
                    }
                  //Check whether authenticated user received or sent neighbour request to requested profile
                  //Check whether authenticated user can be canceled sent neighbour request to requested profile
                    for (index = 0; index < requestsFrom.length; index++) {
                      if (requestsFrom[index].id.toString() === req.body.decoded_token.orgid.toString()) {
                        canSendNeighbourRequest = false;
                        canCancelNeighbourRequest = true;
                      }
                    }

                  //Check whether authenticated user can cancel sent request
                    for (index = 0; index < requestTo.length; index++) {
                      if (requestTo[index].id.toString() === req.body.decoded_token.orgid.toString()) {
                        canSendNeighbourRequest = false;
                        canAnswerNeighbourRequest = true;
                      }
                    }


              }
              //TODO: Issue #6 Check existing knows requests
              plain_data = data.toObject();
              plain_data.isNeighbour = isNeighbour;
              plain_data.canSendNeighbourRequest = canSendNeighbourRequest;
              plain_data.canCancelNeighbourRequest = canCancelNeighbourRequest;
              plain_data.canAnswerNeighbourRequest = canAnswerNeighbourRequest;
              response = {"error": false, "message": plain_data};
              }
              res.json(response);
            }
      });
}

/*
Get CID
*/
function getUserAccountCid(req, res, next){
    var response = {};
    var o_id = mongoose.Types.ObjectId(req.params.id);
    userAccountOp.findById(o_id, {cid: 1, name: 1}, function (err, data) {
      response = {"error": err, "message": data};
      res.json(response);
    });
}

function getIds(array, friends){
  for(var i = 0; i < array.length; i++){
    friends.push(array[i].id);
  }
}


// Export functions
module.exports.get = getUserAccountFacade;
module.exports.getAllFiltered = getAllFilteredUserAccountsFacade;
module.exports.update = updateUserAccountFacade;
module.exports.getUserAccountCid = getUserAccountCid;
