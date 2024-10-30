const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const { PrometheusExporter } = require("@opentelemetry/exporter-prometheus");
const { diag, DiagConsoleLogger, DiagLogLevel } = require("@opentelemetry/api");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-grpc");
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { SimpleLogRecordProcessor } = require("@opentelemetry/sdk-logs");
const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-grpc");

// Set the global logger to log at debug level
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const jaegerExporter = new OTLPTraceExporter({});
const jaegerLogExporter = new OTLPLogExporter({});

const prometheusExporter = new PrometheusExporter({
  startServer: true,
});

const spanProcessor = new SimpleSpanProcessor(jaegerExporter);

const sdk = new NodeSDK({
  serviceName: "tracing-demo",
  traceExporter: jaegerExporter,
  spanProcessors: [spanProcessor],
  metricExporter: prometheusExporter,
  logRecordProcessors: [new SimpleLogRecordProcessor(jaegerLogExporter)],
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

const process = require("process");
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(
      () => console.log("SDK shut down successfully"),
      (err) => console.log("Error shutting down SDK", err)
    )
    .finally(() => process.exit(0));
});
