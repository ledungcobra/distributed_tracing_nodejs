const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");
const { MeterProvider } = require("@opentelemetry/sdk-metrics");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { metrics } = require("@opentelemetry/api");
// const { PrometheusExporter } = require("@opentelemetry/exporter-prometheus");
const {
  OTLPMetricExporter,
} = require("@opentelemetry/exporter-metrics-otlp-grpc");

// Push metrics to OTLP collector
const otlpMetricExporter = new OTLPMetricExporter({
  url: "http://otel-collector:4317",
});

const reader = new PeriodicExportingMetricReader({
  exporter: otlpMetricExporter,
  exportIntervalMillis: 1000,
  exportTimeoutMillis: 1000,
});

const meterProvider = new MeterProvider({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || "metric-service",
  }),
  readers: [reader],
});

if (metrics.setGlobalMeterProvider(meterProvider)) {
  console.log("Meter provider set");
}

const meter = meterProvider.getMeter("example-meter");
const requestCounter = meter.createCounter("my_requests", {
  description: "Count all incoming requests",
});

const histogram = meter.createHistogram("my_histogram", {
  description: "A histogram with a bounded range",
  unit: "1",
  advice: {
    explicitBucketBoundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  },
});

const gauge = meter.createGauge("my_gauge", {
  description: "A gauge",
  unit: "1",
});

const concurrentRequestCounter = meter.createUpDownCounter(
  "concurrent_requests",
  {
    description: "Count concurrent requests",
  }
);

module.exports = {
  requestCounter,
  histogram,
  gauge,
  concurrentRequestCounter,
};
