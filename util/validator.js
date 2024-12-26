const moment = require("moment");

function Validator() {
  this.isValidDate = function (value) {
    return isValidDate(value);
  };

  var isValidDate = function (value) {
    if (value != null && value.length > 0) {
      if (!value.match(/^\d{4}-\d{2}-\d{2}$/)) return false;

      const date = new Date(value);
      if (!date.getTime()) return false;
      return true;
    }

    return true;
  };

  this.isGreaterThanToday = function (value) {
    if (isValidDate(value) && moment(value).diff(moment()) >= 1) {
      return true;
    }

    return false;
  };

  this.isValidMobile = function (value) {
    if (value != null && value.length > 0) {
      if (value.length != 10) return false;
    }
    return true;
  };

  this.isValidCountry = function (value) {
    if (value != null && value.length > 0) {
      if (value == "US") return true;
    }
    return false;
  };



  this.isValidJSONArray = function (value) {
    if (value != null) {
      if (!Array.isArray(value) || value.length == 0) {
        return false;
      }
    } else {
      return false;
    }

    return true;
  };
}

module.exports = new Validator();
