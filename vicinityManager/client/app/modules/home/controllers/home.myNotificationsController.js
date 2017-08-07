'use strict';
angular.module('VicinityManagerApp.controllers').
  controller('myNotificationsController',
  function ($scope,
            $window,
            $timeout,
            userAccountAPIService,
            itemsAPIService,
            notificationsAPIService,
            tokenDecoder,
            registrationsAPIService,
            Notification) {

// ======== Set initial variables ==========

  $(window).trigger('resize');
  $scope.imMobile = Number($window.innerWidth) < 768;
  $(window).on('resize',function(){
    $scope.imMobile = Number($window.innerWidth) < 768;
  });

  $scope.loadedPage = false;
  $scope.rev = true;
  $scope.myOrderBy = 'date';
  $scope.notifs = [];
  $scope.notifs2 = [];

// Checking if user is devOps =========================

$scope.isDev = false;
var payload = tokenDecoder.deToken();
var keyword = new RegExp('devOps');
$scope.isDev = keyword.test(payload.roles);

// ===== Sets from which date we retrieve notifications =====

$scope.dateFrom =  moment().subtract(7, 'days'); // Initialized to one week ago
$scope.period = 'week';

$scope.notificationsDays = function(period){
  $scope.period = period;
  switch(period){
    case 'today':
      $scope.dateFrom =  moment().subtract(1, 'days');
      break;
    case 'week':
      $scope.dateFrom =  moment().subtract(7, 'days');
      break;
    case 'month':
      $scope.dateFrom =  moment().subtract(1, 'months');
      break;
    case 'year':
      $scope.dateFrom =  moment().subtract(1, 'years');
      break;
  }
  init();
};

// ====== Getting notifications onLoad (read and unread) ====

  init();

  function init(){
    $scope.loadedPage = false;
    $scope.dates = [];
    $scope.notifs2 = [];
    notificationsAPIService.getAllUserNotifications($window.sessionStorage.companyAccountId, $scope.dateFrom)
    .then(getNotifs,errorCallback);
  }

  function getNotifs(response){
      $scope.notifs = response.data.message;
      if($scope.isDev){
        notificationsAPIService.getAllRegistrations($scope.dateFrom)
        .then(
          function successCallback(response){
            for(var index in response.data.message){
              $scope.notifs.push(response.data.message[index]);
            }
            addTimestamp();
          },
          errorCallback
        );
      }else{
        addTimestamp();
      }
    }

    function errorCallback(err){
      Notification.error('Error with notifications  ' + err);
    }

    // ========= Other Functions ===============

    function addTimestamp(){
      angular.forEach($scope.notifs,
        function(n) {
          if(n._id){
            var timestamp = n._id.toString().substring(0,8);
            var date = new Date(parseInt( timestamp, 16 ) * 1000 );
            n.timestamp = moment(date);
            n.dateCaption = n.timestamp.format("Do MMM YYYY");
            n.timeCaption = n.timestamp.format("hh:mm a");
          }
          $scope.notifs2.push(n);
          findUnique(n.dateCaption);
         }
      );
        $scope.loadedPage = true;
    }

    function findUnique(a){
      if ($scope.dates.indexOf(a) === -1){
        $scope.dates.push(a);
      }
    }

    function numberOfUnreadNotifs(){ // Need to be hoisted
      $scope.oneNotif = ($scope.notifs.length + $scope.registrations.length) === 1;
      $scope.zeroNotif = ($scope.notifs.length + $scope.registrations.length) === 0;
    }

    function getNotifsAndNotifs(){ // Need to be hoisted
      userAccountAPIService.getNotificationsOfUser($window.sessionStorage.companyAccountId)
        .then(
          function successCallback(response){
            $scope.notifs = response.data.message;
            numberOfUnreadNotifs();
          },
          errorCallback
        );
      }

  $scope.notifResponded =  function(notifID,answer){   // Need to be call external, no need for hoisting
    notificationsAPIService.changeStatusToResponded(notifID,answer)
      .then(
        function successCallback(response){
          // updateScopeAttributes(response);
          init();
        },
        errorCallback
      );
    };

    $scope.changeIsUnreadAndResponded =  function(notifID){   // Need to be call external, no need for hoisting
      notificationsAPIService.changeIsUnreadToFalse(notifID)
        .then($scope.notifResponded(notifID,'responded'), errorCallback);
      };

    $scope.changeIsUnread =  function(notifID){
      notificationsAPIService.changeIsUnreadToFalse(notifID)
        .then(
          function successCallback(response){
            init();
            // updateScopeAttributes(response);
          },
          errorCallback
        );
    };

    function updateScopeAttributes(response){ // Need to be hoisted
      var index = 0;
      for (index in $scope.notifs){
        if ($scope.notifs[index]._id.toString() === response.data.message._id.toString()){        //updatne len tu notif., ktory potrebujeme
            $scope.notifs[index]=response.data.message;
        }
      }
    }

// Accept / Reject requests ======================

$scope.acceptNeighbourRequest = function (notifId, friendId){
  userAccountAPIService.acceptNeighbourRequest(friendId)
      .then(
        function successCallback(response){
          if (response.error) {
              Notification.error("Partnership request acceptation failed :(");
          } else {
              Notification.success("Partnership request accepted!");
          }

          $scope.notifResponded(notifId,'responded');

          // userAccountAPIService.getUserAccountProfile(friendId).success(updateScopeAttributes2);
          // itemsAPIService.addFriendToHasAccess($stateParams.companyAccountId);
      },
      errorCallback
    );
  };

  $scope.rejectNeighbourRequest = function(notifId, friendId) {
    userAccountAPIService.rejectNeighbourRequest(friendId)
        .then(
          function successCallback(response){
            if (response.error) {
                Notification.error("Partnership request rejection failed :(");
            } else {
                Notification.success("Partnership request rejected!");
            }

            $scope.notifResponded(notifId,'responded');
            // userAccountAPIService.getUserAccountProfile(friendId).success(updateScopeAttributes2);
        },
        errorCallback
      );
    };

  $scope.acceptDataRequest = function (dev_id, notifId) {
    // $scope.interruptConnection= true;
   //  Notification.success("Access request sent!");
    itemsAPIService.acceptItemRequest(dev_id)
      .then(
        function successCallback(response) {
      if (response.error) {
          Notification.error("Sending data access request failed!");
      } else {
          Notification.success("Data access approved!");
      }
      $scope.notifResponded(notifId,'responded');
      // itemsAPIService.getItemWithAdd(dev_id).success(updateScopeAttributes2);
      },
      errorCallback
    );
  };

  $scope.rejectDataRequest = function (dev_id, notifId) {
     //  Notification.success("Access request sent!");
      itemsAPIService.rejectItemRequest(dev_id)
        .then(
          function successCallback(response) {
        if (response.error) {
            Notification.error("Sending data access request failed!");
        } else {
            Notification.success("Data access rejected!");
        }
        $scope.notifResponded(notifId,'responded');
        // itemsAPIService.getItemWithAdd(dev_id).success(updateScopeAttributes2);
      },
      errorCallback
    );
  };

  $scope.acceptRegistration = function (reg_id, notifId) {
   registrationsAPIService.putOne(reg_id, {status: "pending" })
     .then(verifyCallback(notifId),errorCallback);
    };


  $scope.rejectRegistration = function (reg_id, notifId) {
    registrationsAPIService.putOne(reg_id, {status: "declined" })
      .then(declineCallback(notifId),errorCallback);
  };

  function verifyCallback(notifId){
    Notification.success("Verification mail was sent to the company!");
    $scope.notifResponded(notifId,'responded');
  }

  function declineCallback(notifId){
    Notification.success("Company was rejected!");
    $scope.notifResponded(notifId,'responded');
  }

  // Sorting

  $scope.orderByMe = function(x) {
    if($scope.myOrderBy === x){
      $scope.rev=!($scope.rev);
    }
      $scope.myOrderBy = x;
  };

  $scope.onSort = function(order){
    $scope.rev = order;
  };

});