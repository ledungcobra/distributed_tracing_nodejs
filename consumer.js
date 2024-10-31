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
    if (!msg) {
      return;
    }

    const ctx = propagation.extract(context.active(), msg.properties.headers);
    context.with(ctx, () => {
      const currentSpan = trace.getSpan(context.active());
      console.log(`Trace id: ${currentSpan.spanContext().traceId}`);
      logger.info(`Received: ${msg.content.toString()}`);
      channel.ack(msg);
      currentSpan.end();
    });
  });

  process.on("SIGINT", () => {
    channel.close();
    connection.close();
  });
}

receiveMessage();
