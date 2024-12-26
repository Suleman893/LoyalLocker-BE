const winston = require('winston'),
    WinstonCloudWatch = require('winston-cloudwatch');

const logger = new winston.createLogger({
    format: winston.format.json(),
    transports: [
        new (winston.transports.Console)({
            timestamp: true,
            colorize: true,
        })
    ]
});

// if (process.env.NODE_ENV === 'prod') {
//     const cloudwatchConfig = {
//         logGroupName: process.env.CLOUDWATCH_GROUP_NAME,
//         logStreamName: `${process.env.CLOUDWATCH_GROUP_NAME}-${process.env.NODE_ENV}`,
//         awsRegion: process.env.CLOUDWATCH_REGION,
//         uploadRate: 5000,
//         messageFormatter: ({ level, message, payload }) => `[${level}] : ${message} \nPayload: ${JSON.stringify(payload)}`
//     }
//     logger.add(new WinstonCloudWatch(cloudwatchConfig))
// }
module.exports = logger;