require("dotenv").config();
require("./otel-setup"); // Must be imported first
const express = require("express");

const amqp = require("amqplib");
const logger = require("./logger");
const { context, trace, propagation, SpanKind } = require("@opentelemetry/api");
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

  channel.sendToQueue(queue, Buffer.from(message));
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

app.get("/test/tracer", (req, res) => {
  const tracer = trace.getTracer("test-tracer", "1.0.0");
  const headers = {};

  tracer.startActiveSpan("doing-some-work", (span) => {
    doSomeWork();
    tracer.startActiveSpan("doing-some-work-2", (s) => {
      doSomeWork();
      propagation.inject(context.active(), headers);
      s.end();
    });
    span.end();
  });

  const childContext = propagation.extract(context.active(), headers);

  context.with(childContext, () => {
    const tracer2 = trace.getTracer("test-tracer-other", "1.0.0");
    tracer2.startActiveSpan("doing-some-work-other", {}, async (s) => {
      await doSomeWork2();
      s.end();
    });
  });

  res.send(headers);
});

app.get("/test/tracer2", (req, res) => {
  const tracer = trace.getTracer("test-tracer", "1.0.0");
  const headers = {};

  tracer.startActiveSpan("doing-some-work", (span) => {
    doSomeWork();
    propagation.inject(context.active(), headers);
    tracer.startActiveSpan("doing-some-work-2", (s) => {
      doSomeWork();
      s.end();
    });
    span.end();
  });

  const childContext = propagation.extract(context.active(), headers);

  context.with(childContext, () => {
    const tracer2 = trace.getTracer("test-tracer-other", "1.0.0");
    tracer2.startActiveSpan("doing-some-work-other", {}, async (s) => {
      await doSomeWork2();
      s.end();
    });
  });

  res.send(headers);
});

function doSomeWork() {
  logger.info("Doing some work");
}

async function doSomeWork2() {
  logger.info("Doing some work 2");
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
