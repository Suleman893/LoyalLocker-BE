const { createClient } = require("redis");

function RedisConnection() {
  this.getConnection = function () {
    if (this.instance === null) {
      let redisClient;
      redisClient = createClient({
        url: process.env.REDIS_CLIENT,
      });

      redisClient.on("connect", () => {
        console.log("Connected to Redis Server");
      });

      redisClient.on("error", (err) => {
        console.error("Error from Redis:", err);
      });

      this.instance = {
        redisClient: redisClient,
      };
      return this.instance;
    } else {
      return this.instance;
    }
  };
}

RedisConnection.prototype.instance = null;
module.exports = new RedisConnection();
