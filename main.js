require("./otel-setup"); // Must be imported first

const amqp = require("amqplib");
const express = require("express");
const { context, trace, propagation } = require("@opentelemetry/api");
const logger = require("./logger");
const app = express();

async function sendMessage(message) {
  const connection = await amqp.connect("amqp://user:password@localhost");
  const channel = await connection.createChannel();
  const queue = "tracing-demo";

  await channel.assertQueue(queue, { durable: false });

  // Get the current span and inject the context into the message headers
  const currentSpan = trace.getSpan(context.active());
  const headers = {};
  if (currentSpan) {
    propagation.inject(context.active(), headers);
  }

  channel.sendToQueue(queue, Buffer.from(message), { headers });
  logger.info(`Message sent: ${message}`);

  await channel.close();
  await connection.close();
}

async function receiveMessage() {
  const connection = await amqp.connect("amqp://user:password@localhost");
  const channel = await connection.createChannel();
  const queue = "tracing-demo";

  await channel.assertQueue(queue, { durable: false });
  channel.consume(queue, (msg) => {
    if (msg) {
      const msgContext = propagation.extract(
        context.active(),
        msg.properties.headers
      );
      context.with(msgContext, () => {
        logger.info(`Received: ${msg.content.toString()}`);
        channel.ack(msg);
      });
    }
  });
}

app.get("/send/:message", async (req, res) => {
  logger.info(`Sending message ${req.params.message}`);
  await sendMessage(req.params.message);
  res.send("Message sent");
});

receiveMessage();

app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
