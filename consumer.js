require("dotenv").config();
require("./otel-setup"); // Must be imported first
const express = require("express");

const app = express();

const amqp = require("amqplib");
const logger = require("./logger");
const { context, propagation, trace } = require("@opentelemetry/api");
const apiMetrics = require("prometheus-api-metrics");
app.use(apiMetrics());

async function receiveMessage() {
  console.log("Starting consumer");

  const connection = await amqp.connect(
    process.env.RABBITMQ_ENDPOINT || "amqp://user:password@localhost"
  );
  const channel = await connection.createChannel();
  const queue = "tracing-demo";

  await channel.assertQueue(queue, { durable: false });

  channel.consume(queue, (msg) => {
    if (!msg) return;
    logger.info(`Received: ${msg.content.toString()}`);
    const span = trace.getActiveSpan();
    span.end();
    channel.ack(msg);
  });

  process.on("SIGINT", () => {
    channel.close();
    connection.close();
  });
}

app.get("/say-hello", (req, res) => {
  logger.info("Saying hello");
  res.send("Hello");
});

app.listen(process.env.CONSUMER_PORT, () => {
  console.log(`Consumer is running on port ${process.env.CONSUMER_PORT}`);
});

receiveMessage();
