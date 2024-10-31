const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const { PrometheusExporter } = require("@opentelemetry/exporter-prometheus");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-grpc");
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics"); 
// Set the global logger to log at debug level
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const jaegerExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://otel-collector:4317",
});

// const prometheusExporter = new PrometheusExporter({
// });

const spanProcessor = new SimpleSpanProcessor(jaegerExporter);

const sdk = new NodeSDK({
  serviceName: process.env.SERVICE_NAME || "tracing-demo",
  traceExporter: jaegerExporter,
  spanProcessors: [spanProcessor],
  // metricReader: prometheusExporter,
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

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(
      () => console.log("SDK shut down successfully"),
      (err) => console.log("Error shutting down SDK", err)
    )
    .finally(() => process.exit(0));
});
