const constants = require("../constants.js");
const dashboardService = require("../services/dashboardService.js");
const appUtils = require("../util/appUtil");

module.exports = (app) => {
  //Admin getting all the company/brands/merchants for DropDown in Admin dashboard
  app.get(
    `${constants.baseAPIPath}/admin/dashboard/all-merchants`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await dashboardService.getMerchantsForDropDown(req, res);
    }
  );

  //Admin dashboard API
  app.get(
    `${constants.baseAPIPath}/admin/dashboard/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await dashboardService.getAdminDashboard(req, res);
    }
  );

  //Merchant dashboard API
  app.get(
    `${constants.baseAPIPath}/merchant/dashboard`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await dashboardService.getMerchantDashboard(req, res);
    }
  );

  //Consumer dashboard API
  app.get(
    `${constants.baseAPIPath}/consumer/dashboard`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_USER);
    },
    async (req, res) => {
      await dashboardService.getConsumerDashboard(req, res);
    }
  );
};
