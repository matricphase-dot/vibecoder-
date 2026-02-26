import IORedis from "ioredis";

const redis = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
});

const key = (jobId) => `joblog:${jobId}`;

export async function appendLog(jobId, line) {
  const entry = JSON.stringify({ t: Date.now(), line: String(line) });
  await redis.rpush(key(jobId), entry);
  await redis.expire(key(jobId), 60 * 60 * 24);
}

export async function readLogs(jobId, start = 0, end = -1) {
  const arr = await redis.lrange(key(jobId), start, end);
  return arr.map((x) => {
    try {
      return JSON.parse(x);
    } catch {
      return { t: Date.now(), line: String(x) };
    }
  });
}
