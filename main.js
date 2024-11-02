require("dotenv").config();
require("./otel-setup"); // Must be imported first
const express = require("express");

const amqp = require("amqplib");
const logger = require("./logger");
const {
  context,
  trace,
  propagation,
  SpanKind,
  SpanStatusCode,
} = require("@opentelemetry/api");
const apiMetrics = require("prometheus-api-metrics");
const {
  ATTR_CLIENT_ADDRESS,
  ATTR_EXCEPTION_MESSAGE,
} = require("@opentelemetry/semantic-conventions");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const { doSomeWork, doSomeWork2, sleep, genError } = require("./helper_func");

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
  const span = trace.getActiveSpan();
  span.setAttributes({
    [ATTR_CLIENT_ADDRESS]: req.ip,
  });
  await sendMessage(req.params.message);
  res.send(
    `Message sent with trace id ${
      trace.getSpan(context.active()).spanContext().traceId
    }`
  );
});

app.get("/call-say-hello", async (req, res) => {
  const response = await fetch(
    `http://consumer:${process.env.CONSUMER_PORT}/say-hello`
  );
  const body = await response.text();
  logger.info(`Response from consumer: ${body}`);
  const span = trace.getActiveSpan();
  res.send(body + " trace id = " + span.spanContext().traceId);
});

app.get("/test/tracer", (req, res) => {
  const tracer = trace.getTracer("test-tracer", "1.0.0");
  const headers = {};

  // Assume this is service A
  tracer.startActiveSpan("doing-some-work", (span) => {
    doSomeWork();
    tracer.startActiveSpan("doing-some-work-2", (s) => {
      doSomeWork();
      propagation.inject(context.active(), headers);
      s.end();
    });
    span.end();
  });

  // Assume this is service B
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

app.get("/test/events", async (req, res) => {
  const span = trace.getSpan(context.active());
  span.addEvent("initial-event", {
    message: "Initial event",
  });

  await sleep(1000);

  span.addEvent("second-event", {
    message: "Second event",
  });

  res.send(span.spanContext().traceId + " - " + span.spanContext().spanId);
});

app.get("/test/error", (req, res) => {
  try {
    genError();
    res.send("ok");
  } catch (err) {
    const span = trace.getActiveSpan();
    span.addEvent("exception", {
      [ATTR_EXCEPTION_MESSAGE]: err.message,
    });
    logger.error(err);
    res
      .status(500)
      .send(span.spanContext().traceId + " - " + span.spanContext().spanId);
  }
});

app.get("/test/error2", (req, res) => {
  try {
    genError();
    res.send("ok");
  } catch (err) {
    const span = trace.getActiveSpan();

    span.recordException(err);
    logger.error(err);
    res
      .status(500)
      .send(span.spanContext().traceId + " - " + span.spanContext().spanId);
  }
});

app.get("/test/status_ok", (req, res) => {
  const span = trace.getActiveSpan();
  span.setStatus({
    code: SpanStatusCode.OK,
  });
  res
    .status(200)
    .send(span.spanContext().traceId + " - " + span.spanContext().spanId);
});

app.get("/test/status_error", (req, res) => {
  const span = trace.getActiveSpan();
  span.setStatus({
    code: SpanStatusCode.ERROR,
  });
  
  const tracer = trace.getTracerProvider().getTracer('test')

  res
    .status(500)
    .send(span.spanContext().traceId + " - " + span.spanContext().spanId);
});

// handle errors
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).send("Internal server error");
});

app.listen(process.env.PUBLISHER_PORT, () => {
  console.log(`Server is running on port ${process.env.PUBLISHER_PORT}`);
});
