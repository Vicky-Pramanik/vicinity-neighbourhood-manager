'use strict';
angular.module('VicinityManagerApp.controllers')
.controller('serviceProfileController',
function ($scope, $window, $state, $stateParams, $location, tokenDecoder, commonHelpers, itemsAPIService, Notification) {

  $scope.locationPrefix = $location.path();

// Initialize variables and data =====================
// ====== Triggers window resize to avoid bug =======
  commonHelpers.triggerResize();

  $scope.itemEnabled = false;
  $scope.showInput = false;
  $scope.isMyItem = false;
  $scope.isMyOrgItem = false;
  $scope.imServiceProvider = false;
  $scope.loaded = false;
  $scope.imAdmin = false;
  $scope.canRequestService = false;
  $scope.item = {};
  $scope.contracted = false;
  $scope.owner = "";
  $scope.gateway = {};

  // Initialize DOM
  $('a#accessEdit').show();
  $('a#accessSave').hide();
  $('a#accessCancel').hide();
  $('select#editAccessName').hide();
  $('p#accessName').show();
  $('div#moveEdit').show();
  $('a#moveSave').hide();
  $('a#moveCancel').hide();
  $('select#editMoveName').hide();

  initData();

  function initData(){
    itemsAPIService.getItemWithAdd($stateParams.serviceId)
      .then(
        function successCallback(response){
          $scope.isMyItem = false;
          $scope.isMyOrgItem = false;
          $scope.loaded = false;
          updateScopeAttributes(response);
          $scope.loaded = true;
        },
        function errorCallback(response){
          Notification.error('Problem fetching data');
        }
      );
      var payload = tokenDecoder.deToken();
      for(var i in payload.roles){
        if(payload.roles[i] === 'service provider'){
          $scope.imServiceProvider = true;
        }
        if(payload.roles[i] === 'infrastructure operator'){
          $scope.canRequestService = true;
        }
        if(payload.roles[i] === 'administrator'){
          $scope.imAdmin = true;
        }
      }
    }

    function updateScopeAttributes(response){
        $scope.item = response.data.message[0];
        $scope.name = $scope.item.cid.id.name;
        $scope.item.uid = $scope.item.uid === undefined ? {} : $scope.item.uid; // Case device disabled
        $scope.itemEnabled = ($scope.item.status === 'enabled');
        $scope.owner = $scope.item.uid.extid;
        $scope.gateway = {
          id: $scope.item.adid.id,
          adid: $scope.item.adid.extid,
          name: $scope.item.adid.name,
          type: $scope.item.adid.type,
          logo: $scope.item.adid.type === "shq" ? "img/logos/shqlogo.png" : "img/logos/vcntlogo.png"
        };

        var aux = ["Private", "Partners with Data Under Request", "Public with Data Under Request"];
        $scope.ALcaption = aux[$scope.item.accessLevel];

        if($scope.itemEnabled) $scope.isMyItem = ($window.sessionStorage.userAccountId.toString() === $scope.item.uid.id.toString());
        $scope.isMyOrgItem = ($window.sessionStorage.companyAccountId.toString() === $scope.item.cid.id._id.toString());

        $scope.nContracts = 0;
        $scope.contracted = false;
        for(var i = 0; i <  $scope.item.hasContracts.length; i++){
          if($scope.item.hasContracts[i].contractingUser.toString() === $window.sessionStorage.userAccountId.toString()){
            $scope.contracted = true;
            $scope.nContracts = $scope.nContracts + 1;
          }
        }
      }

    $scope.changeStatus = function(){
      var query = {};
      if($scope.item.status === 'enabled'){
        query = {
          "status":'disabled',
          "o_id": $scope.item._id,
          "oid": $scope.item.oid,
          "typeOfItem": "service"
        };
      }else{
        query = {
          "status":'enabled',
          "o_id": $scope.item._id,
          "oid": $scope.item.oid,
          "typeOfItem": "service"
        };
      }
      itemsAPIService.putOne(query)
        .then(
          function successCallback(response){
            if(response.data.success){
              Notification.success('Service status updated!!');
              initData();
            } else {
              Notification.warning('Unauthorized');
            }
          },
          function errorCallback(response){
          }
        );
    };

  $scope.deleteItem = function(){
    if(confirm('Are you sure?')){
      itemsAPIService.deleteItem($scope.item.oid)
        .then(
          function successCallback(response){
            Notification.success('service deleted');
            $state.go("root.main.allServices");
          },
          function errorCallback(response){
            Notification.error('Problem deleting item');
          }
        );
      }
    };

// HIDE && SHOW DOM =========================

  //Access Level

  $scope.changeToInput = function () {
    $('a#accessEdit').hide();
    $('p#accessName').hide();
    $('select#editAccessName').show();
    $('a#accessSave').fadeIn('slow');
    $('a#accessCancel').fadeIn('slow');
  };

  $scope.backToEdit = function () {
    $('a#accessCancel').fadeOut('slow');
    $('a#accessSave').fadeOut('slow');
    $('select#editAccessName').fadeOut('slow');
    setTimeout(function() {
      $('a#accessEdit').fadeIn('fast');
      $('p#accessName').fadeIn('fast');
    }, 600);
  };

  $scope.saveNewAccess = function () {
    if (Number($('select#editAccessName').val()) !== 0){
        itemsAPIService.putOne(
            {accessLevel: $('select#editAccessName').val() - 1,
            typeOfItem: "service",
            o_id: $scope.item._id,
            oid: $scope.item.oid,
            uid: $scope.owner,
            oldAccessLevel: $scope.item.accessLevel })
          .then(
            function successCallback(response){
              if(response.data.success){
                Notification.success("Access level updated");
              } else {
                Notification.warning("User access level is too low...");
              }
              initData();
              $scope.backToEdit();
            }
          )
          .catch(function(err){
            Notification.error(err);
          });
        }
      };

      // Move / Change item owner/gateway

      $scope.changeToInputMove = function () {
        $('div#moveEdit').hide();
        $('select#editMoveName').fadeIn('slow');
        $('a#moveSave').fadeIn('slow');
        $('a#moveCancel').fadeIn('slow');
      };

      $scope.backToEditMove = function () {
        $('a#moveCancel').fadeOut('slow');
        $('a#moveSave').fadeOut('slow');
        $('select#editMoveName').fadeOut('slow');
        setTimeout(function() {
          $('div#moveEdit').fadeIn('fast');
        }, 600);
      };

      $scope.saveNewAccessMove = function(){
        var newThing = JSON.parse($('select#editMoveName').val());
        var item = {
          id: $scope.item._id,
          extid: $scope.item.oid,
          name: $scope.item.name
        };
        if(newThing.hasOwnProperty("adid")){
          var adid = {
            id: newThing._id,
            extid: newThing.adid,
            name: newThing.name,
            type: $scope.gateway.type
          };
          itemsAPIService.changeGateway({oid: item, adid: adid})
          .then(function(response){
            Notification.success('Gateway changed successfuly');
            initData();
            $scope.backToEditMove();
          })
          .catch(function(error){
            Notification.error('Error changing gateway: ' + error);
            $scope.backToEditMove();
          });
        } else {
          var uidNew = {
            id: newThing._id,
            extid: newThing.email,
            name: newThing.name
          };
          var uidOld = {
            id: $scope.item.uid.id,
            extid: $scope.item.uid.extid,
            name: $scope.item.uid.name
          };
          itemsAPIService.moveItem({oid: item, uidNew: uidNew, uidOld: uidOld})
          .then(function(response){
            Notification.success('Owner changed successfuly');
            initData();
            $scope.backToEditMove();
          })
          .catch(function(error){
            Notification.error('Error changing gateway: ' + error);
            $scope.backToEditMove();
          });
        }
      };

      $scope.changeOwner = function(){
        $scope.moveThings = [];
        itemsAPIService.getMoveUsers('service')
        .then(function(response){
          if(response.data.message.length > 0){
            $scope.moveThings = response.data.message;
            $scope.changeToInputMove();
            removeCurrent($scope.item.uid.id);
          } else {
            Notification.warning("There aren't available users...");
          }
        })
        .catch(function(error){
          Notification.error(error);
        });
      };

      $scope.changeGateway = function(){
        $scope.moveThings = [];
        itemsAPIService.getMoveGateways($scope.gateway.type)
        .then(function(response){
          if(response.data.message.length > 0){
            $scope.moveThings = response.data.message;
            $scope.changeToInputMove();
            removeCurrent($scope.gateway.id);
          } else {
            Notification.warning("There aren't available gateways...");
          }
        })
        .catch(function(error){
          Notification.error(error);
        });
      };

      function removeCurrent(id){
          for(var i = 0, l = $scope.moveThings.length; i < l; i++){
              if($scope.moveThings[i]._id.toString() === id.toString()){
                $scope.moveThings.splice(i,1);
                return true;
              }
          }
      }


  // Location

// Load picture mgmt =============================

var base64String= "";

$("input#input1").on('change',function(evt) {

  var tgt = evt.target || window.event.srcElement,
        files = tgt.files;

  if (FileReader && files && files.length) {
        var fr = new FileReader();
        fr.onload = function () {
            // $("img#pic").src = fr.result;
            $("img#pic").prop("src",fr.result);
            base64String = fr.result;
        };
        fr.readAsDataURL(files[0]);
    }else{
        // fallback -- perhaps submit the input to an iframe and temporarily store
        // them on the server until the user's session ends.
    }
});

$scope.showLoadPic = function(){
  $scope.showInput = true;
  $('#editCancel1').fadeIn('slow');
  $('#editUpload2').fadeIn('slow');
  $('#input1').fadeIn('slow');
};

$scope.cancelLoadPic = function(){
  $('#editCancel1').fadeOut('slow');
  $('#editUpload2').fadeOut('slow');
  $('#input1').fadeOut('slow');
  $('img#pic').fadeOut('slow');
  setTimeout(function() {
    $("img#pic").prop("src",$scope.item.avatar);
    $('img#pic').fadeIn('slow');
 }, 600);
};

$scope.uploadPic = function(){
  itemsAPIService.putOne({o_id:$scope.item._id, avatar: base64String, typeOfItem: "service", oid: $scope.item.oid})
    .then(
      function successCallback(response){
        itemsAPIService.getItemWithAdd($stateParams.serviceId)
          .then(
            function successCallback(response){
              if(response.data.success){
                Notification.success('Service status updated!!');
                $scope.item = response.data.message;
                $('#editCancel1').fadeOut('slow');
                $('#editUpload2').fadeOut('slow');
                $('#input1').fadeOut('slow');
                $('img#pic').fadeOut('slow');
                setTimeout(function() {
                  $("img#pic").prop("src",$scope.item.avatar);
                  $('img#pic').fadeIn('slow');
               }, 600);
             } else {
               Notification.warning('Unauthorized');
             }
           },
           function errorCallback(response){
             Notification.error(response);
           }
         );
      }
    );
  };
});
