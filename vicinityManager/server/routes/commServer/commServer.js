var logger = require("../../middlewares/logger");
var sRegistration = require("../../helpers/items/registration");
var sSearch = require("../../helpers/items/search");
var sDelItems = require("../../helpers/items/deleteItems");
var sDelNode = require('../../helpers/nodes/processNode');

var nodeOp = require('../../models/vicinityManager').node;
var userAccountOp = require('../../models/vicinityManager').userAccount;

// Public functions

function registration(req, res){
  var data = req.body;
  sRegistration.create(data, function(err, response){
    res.json({error: err, message: response});
  });
}

function searchItems(req, res){
  var data = req.body;
  sSearch.searchItems(data, function(err, response){
    res.json({error: err, message: response});
  });
}

function deleteItems(req, res){
  var data = req.body.oids;
  sDelItems.deleteItems(data)
  .then(function(response){res.json({"error": false, "message": response});})
  .catch(function(err){res.json({"error": true, "message": err});});
}

function enableItems(req, res){
  var data = req.body;
  res.json({error :false, message:"not implemented"});
}

function disableItems(req, res){
  var data = req.body;
  res.json({error :false, message:"not implemented"});
}

function updateItems(req, res){
  var data = req.body;
  res.json({error :false, message:"not implemented"});
}

function getAgentItems(req, res){
  var data = req.body;
  res.json({error :false, message:"not implemented"});
}

function deleteAgent(req, res){
  var adid = req.params.adid;
  var adids = [];
  nodeOp.findOneAndUpdate({adid: adid}, {$set: {'status': 'deleted'}}, { new: true })
  .then(function(data){
      var cid = data.cid.id;
      return userAccountOp.update({_id: cid}, {$pull: {hasNodes: {extid: adid}} });
    })
  .then(function(response){
      adids.push(adid);
      return sDelNode.deleteNode(adids);
    })
  .then(function(response){res.json({"error": false, "message": response});})
  .catch(function(err){res.json({"error": true, "message": err});});
}

// Export modules

module.exports.registration = registration;
module.exports.searchItems = searchItems;
module.exports.deleteItems = deleteItems;
module.exports.enableItems = enableItems;
module.exports.disableItems = disableItems;
module.exports.updateItems = updateItems;
module.exports.getAgentItems = getAgentItems;
module.exports.deleteAgent = deleteAgent;