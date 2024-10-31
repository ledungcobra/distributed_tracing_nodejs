const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-grpc");
const {
  BatchLogRecordProcessor,
  LoggerProvider,
} = require("@opentelemetry/sdk-logs");

// Set the global logger to log at debug level
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
const resource = {
  attributes: {
    "service.name": process.env.SERVICE_NAME || "tracing-service",
  },
};
const loggerExporter = new OTLPLogExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4317",
});

const loggerProvider = new LoggerProvider({resource});
const logRecordProcessor = new BatchLogRecordProcessor(loggerExporter);

loggerProvider.addLogRecordProcessor(logRecordProcessor);

module.exports = { loggerProvider, logProcessor: logRecordProcessor };