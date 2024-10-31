require("dotenv").config();
require("./otel-setup"); // Must be imported first
const express = require("express");

const amqp = require("amqplib");
const logger = require("./logger");
const { context, trace, propagation } = require("@opentelemetry/api");
const apiMetrics = require("prometheus-api-metrics");
const app = express();
app.use(apiMetrics());

async function sendMessage(message) {
  const connection = await amqp.connect(
    process.env.RABBITMQ_ENDPOINT || "amqp://user:password@localhost"
  );
  const channel = await connection.createChannel();
  const queue = "tracing-demo";

  await channel.assertQueue(queue, { durable: false });

  // if (!currentSpan) {
  //   console.log("No active span");
  // }

  const headers = {};
  propagation.inject(context.active(), headers);

  channel.sendToQueue(queue, Buffer.from(message), { headers });
  logger.info(`Message sent: ${message}`);
  await channel.close();
  await connection.close();
}

app.get("/send/:message", async (req, res) => {
  logger.info(`Sending message ${req.params.message}`);
  await sendMessage(req.params.message);
  res.send(
    `Message sent with trace id ${
      trace.getSpan(context.active()).spanContext().traceId
    }`
  );
});

app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
