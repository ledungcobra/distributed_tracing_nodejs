const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-grpc");
const {
  SimpleSpanProcessor,
  BatchSpanProcessor,
} = require("@opentelemetry/sdk-trace-base");

const {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  trace,
  propagation,
} = require("@opentelemetry/api");
const { logRecordProcessor } = require("./log_provider");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");

// Set the global logger to log at debug level
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const oltpTraceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4317",
});

/**
 * BatchSpanProcessor options
 * exportTimeoutMillis: 60000,
 */
const batchSpanProcessorOptions = {
  exportTimeoutMillis: 60000, // allow 60 seconds for the exporter to send the data consider failure
  scheduledDelayMillis: 500, // delay between batches
  maxQueueSize: 20000, // max number of spans to hold in the queue
  maxExportBatchSize: 5000, // max number of spans to send in a single batch
};

const spanProcessor =
  process.env.NODE_ENV === "production"
    ? new BatchSpanProcessor(oltpTraceExporter, batchSpanProcessorOptions)
    : new SimpleSpanProcessor(oltpTraceExporter);

// Optionaly configure instrumentation
const { B3Propagator } = require("@opentelemetry/propagator-b3");
const { AWSXRayPropagator } = require("@opentelemetry/propagator-aws-xray");
const { CompositePropagator } = require("@opentelemetry/core");
const { W3CTraceContextPropagator } = require("@opentelemetry/core");

const propagator = new CompositePropagator({
  propagators: [
    new W3CTraceContextPropagator(),
    new B3Propagator(),
    new AWSXRayPropagator(),
  ],
});

const sdk = new NodeSDK({
  serviceName: process.env.SERVICE_NAME || "tracing-service",
  traceExporter: oltpTraceExporter,
  logRecordProcessors: [logRecordProcessor],
  spanProcessors: [spanProcessor],
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || "tracing-service",
  }),
  instrumentations: [getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-http": {
      enabled: true,
      ignoreIncomingRequestHook: (req) => {
        // Ignore metrics and health check endpoints
        const extractPaths = ["/metrics", "/health", "/"];
        const wildcardPaths = ["/test/*"];
        return (
          extractPaths.includes(req.url) ||
          wildcardPaths.some((path) => req.url.startsWith(path))
        );
      },
    },
    "@opentelemetry/instrumentation-amqplib": {
      enabled: true,
    },
    '@opentelemetry/instrumentation-pg': {
      
    }
  })],
  resourceDetectors: [
    {
      detect: () => {
        return new Resource({
          "container.name": "test",
        });
      },
    },
  ],
  textMapPropagator: propagator,
});

sdk.start();

const shutdown = () =>
  sdk
    .shutdown()
    .then(
      () => console.log("SDK shut down successfully"),
      (err) => console.log("Error shutting down SDK", err)
    )
    .finally(() => process.exit(0));

["SIGTERM", "SIGINT"].forEach((signal) => {
  process.on(signal, shutdown);
});
