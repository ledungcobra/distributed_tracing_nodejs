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
    if (msg) {
      console.log("Headers: " + JSON.stringify(msg.properties.headers));

      const ctx = propagation.extract(context.active(), msg.properties.headers);
      context.with(ctx, () => {
        const currentSpan = trace.getSpan(ctx);
        console.log(`Trace id: ${currentSpan.spanContext().traceId}`);
        console.log(`Span id: ${currentSpan.spanContext().spanId}`);
        logger.info(`Context: ` + JSON.stringify(ctx));

        // Add span context to the log
        logger.info(`Received: ${msg.content.toString()}`);
        channel.ack(msg);
        currentSpan.end();
      });
    }
  });

  process.on("SIGINT", () => {
    channel.close();
    connection.close();
  });
}

receiveMessage();
