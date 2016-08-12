angular.module('VicinityManagerApp.controllers').
  controller('myServices', function ($scope, searchAPIService, userAccountAPIService, $stateParams, $window) {
    $scope.resultsList = [];
    $scope.loaded = false;
    $scope.activeCompanyID = $window.sessionStorage.companyAccountId;


    // $scope.searchFilter = function (result) {
    //   var keyword = new RegExp($stateParams.searchTerm, 'i');
    //
    //   return !$stateParams.searchTerm || keyword.test(result.organisation) ;   // || keyword.test(result.accountOf.occupation)
    // };

    // userAccountAPIService.getUserAccounts().success(function (response) {
    //   var results = response.message;
    //   $scope.resultsList = results;
    //   $scope.loaded = true;
    // });

    userAccountAPIService.getFriends($window.sessionStorage.companyAccountId).success(function (response){
      var results = response.message;
      $scope.resultsList = results;
      $scope.loaded = true;
    });

  });