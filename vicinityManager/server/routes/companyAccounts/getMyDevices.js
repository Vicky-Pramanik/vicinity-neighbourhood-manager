var mongoose = require('mongoose');
var itemOp = require('../../models/vicinityManager').item;

function getMyDevices(req, res, next) {
//TODO: User authentic - Role check
  var response = {};

  itemOp.find({}, function(err, data) {
    if (err) {
      response = {"error": true, "message": "Error fetching data"};
    } else {
      response = {"error": false, "message": data};
    }
    res.json(response);
  });

}

// module.exports.getMyDevices = getMyDevices;
