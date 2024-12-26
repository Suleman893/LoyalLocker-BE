# Project Name
Loyal Locker BE

## Overview
The project built with Node.js, Express, PostgresSQL and Sequelize.js. The backend is deployed on AWS EC2, with the database running on AWS RDS and Redis managed by AWS ElastiCache.


### Backend (AWS EC2)
The backend of this application is hosted on an AWS EC2 instance. To connect to the EC2 instance, use the following connection string:

ssh -i "loyallockerNVirginia.pem" ec2-user@ec2-100-28-112-118.compute-1.amazonaws.com


### Database (AWS RDS)
The application's relational database is managed by AWS RDS. You can connect to the database using the following endpoint:

loyallocker-rds.c3zvxlm8uoed.us-east-2.rds.amazonaws.com

### Redis (AWS ElastiCache)
Session management and caching are handled by Redis, which is hosted on AWS ElastiCache. The primary node connection string for Redis is:

redis://loyallocker-redis-session.xx4jfi.ng.0001.use1.cache.amazonaws.com:6379