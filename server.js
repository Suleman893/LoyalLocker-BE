const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config({ path: `config/prod/.env` });
require("express-async-errors");
const session = require("express-session");
const passport = require("passport");
const helmet = require("helmet");
const cors = require("cors");
var favicon = require("serve-favicon");
var path = require("path");

// Custom modules
const dbConn = require("./services/databaseConnection");
const redisConn = require("./services/redisConnection");
require("./services/passport");

//Express app
const app = express();

//Sessions Connections
let RedisStore = require("connect-redis")(session);
let redisClient = redisConn.getConnection().redisClient;
dbConn.setConnection();
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "dev"
        ? process.env.FRONTEND_DEV_URL
        : process.env.FRONTEND_LIVE_URL,
    credentials: true,
  })
);

// Trust proxy for nginx load balancer
if (process.env.NODE_ENV === "prod") {
  app.set("trust proxy", 1);
}

//Just for vercel
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_KEY,
    name: "sessionId",
    saveUninitialized: false,
    resave: false,
    cookie: {
      domain: process.env.NODE_ENV === "dev" ? undefined : ".loyallocker.com",
      secure: process.env.NODE_ENV === "dev" ? false : true,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "dev" ? "lax" : "None",
    },
  })
);

function setResponseObject(req, res, next) {
  res.body = { status_code: 200, response: {} };
  next();
}
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(setResponseObject);

// var corsOptionsDelegate = function (req, callback) {
//   callback(null, {
//     origin: true,
//     credentials: true,
//   });
// };

// const corsOptions = {
//   origin: "*",
//   credentials: true,
// };

app.use(helmet());
app.use(passport.initialize());
app.use(passport.session());
// app.use(cors(corsOptionsDelegate));

//AWS health check route
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

//initial route
app.get("/", (req, res) => {
  res.status(200).send("Initial route running...!");
});

require("./routes/authRoutes")(app);
require("./routes/adminRoutes")(app);
require("./routes/merchantRoutes")(app);
require("./routes/consumerRoutes.js")(app);
require("./routes/campaignRoutes.js")(app);
require("./routes/pointTransferRoutes.js")(app);
require("./routes/eventRuleRoutes.js")(app);
require("./routes/shopifyRoutes.js")(app);
require("./routes/dashboardRoutes.js")(app);
require("./services/cronService");

app.use((req, res) => {
  res.status(404).json({ error: "Route Not Found" });
});

app.use((err, req, res, next) => {
  if (err) {
    res.body.status_code = err?.statusCode || 500;
    res.body.response = err?.message || "Server Error";
    return res.status(res.body.status_code).send(res.body);
  }
  next(err);
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.error(`Listening to port ${port}`);
});
