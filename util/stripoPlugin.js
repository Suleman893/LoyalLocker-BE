const axios = require("axios");

function StripoPlugin() {
  this.token = null;

  this.getToken = async function () {
    if (this.token == null) {
      let data = {
        pluginId: process.env.STRIPO_PLUGIN_ID,
        secretKey: process.env.STRIPO_SECRET_KEY,
      };

      let response = await axios({
        method: "post",
        url: "https://plugins.stripo.email/api/v1/auth",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: data,
      });

      if (response.status == 200) {
        this.token = response.data;
      }
    }

    return this.token;
  };
}

module.exports = new StripoPlugin();
