const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const { PrometheusExporter } = require("@opentelemetry/exporter-prometheus");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-grpc");
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");

const { diag, DiagConsoleLogger, DiagLogLevel } = require("@opentelemetry/api");
const { logRecordProcessor } = require("./log_provider");
const { Resource } = require("@opentelemetry/resources");
// Set the global logger to log at debug level
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const oltpTraceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4317",
});

const spanProcessor = new SimpleSpanProcessor(oltpTraceExporter);

const sdk = new NodeSDK({
  serviceName: process.env.SERVICE_NAME || "tracing-service",
  traceExporter: oltpTraceExporter,
  logRecordProcessors: [logRecordProcessor],
  spanProcessors: [spanProcessor],

  resource: new Resource({
    "service.name": process.env.SERVICE_NAME || "tracing-service",
  }),

  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": {
        enabled: true,
      },
      "@opentelemetry/instrumentation-amqplib": {
        enabled: true,
      },
    }),
  ],
});

sdk.start();

function shutdown() {
  sdk
    .shutdown()
    .then(
      () => console.log("SDK shut down successfully"),
      (err) => console.log("Error shutting down SDK", err)
    )
    .finally(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
