const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const { PrometheusExporter } = require("@opentelemetry/exporter-prometheus");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-grpc");
const {
  SimpleSpanProcessor,
  BatchSpanProcessor,
} = require("@opentelemetry/sdk-trace-base");

const { diag, DiagConsoleLogger, DiagLogLevel, trace } = require("@opentelemetry/api");
const { logRecordProcessor } = require("./log_provider");
const { Resource } = require("@opentelemetry/resources");
// Set the global logger to log at debug level
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const oltpTraceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4317",
});

/**
 * BatchSpanProcessor options
 * exportTimeoutMillis: 60000,
 */
const batchSpanProcessorOptions = {
  exportTimeoutMillis: 60000, // allow 60 seconds for the exporter to send the data consider failure
  scheduledDelayMillis: 1000, // delay between batches
  maxQueueSize: 10000, // max number of spans to hold in the queue
  maxExportBatchSize: 1000, // max number of spans to send in a single batch
};



const spanProcessor =
  process.env.NODE_ENV === "production"
    ? new BatchSpanProcessor(oltpTraceExporter, batchSpanProcessorOptions)
    : new SimpleSpanProcessor(oltpTraceExporter);

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

["SIGTERM", "SIGINT"].forEach((signal) => {
  process.on(signal, shutdown);
});
