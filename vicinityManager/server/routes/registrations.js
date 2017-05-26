var express = require('express');
var router = express.Router();

var postHelper = require('./registrations/post.js');
var getHelper = require('./registrations/get.js');
var putHelper = require('./registrations/put.js');

router
  .post('/', postHelper.postOne)
  .get('/', getHelper.getAll)
  .get('/:id', getHelper.getOne)
  .put('/:id', putHelper.putOne)
  // look for duplicates
  .post('/duplicatesUser', postHelper.findDuplicatesUser)
  .post('/duplicatesCompany', postHelper.findDuplicatesCompany)
  
module.exports = router;
