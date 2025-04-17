const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Error connecting to Redis:', err);
  }
})();

module.exports = redisClient;
