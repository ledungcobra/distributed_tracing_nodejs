const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-grpc");
const {
  BatchLogRecordProcessor,
  LoggerProvider,
} = require("@opentelemetry/sdk-logs");
const { loggerProvider } = require("./log_provider");
const { context } = require("@opentelemetry/api");

// Set the global logger to log at debug level
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

class Logger {
  constructor() {
    this.logger = loggerProvider.getLogger("example-logger");
  }

  info(message) {
    this.logger.emit({
      body: message,
      severity: "INFO",
      context: context.active(),
    });
  }

  error(message) {
    this.logger.emit({
      body: message,
      severity: "ERROR",
      context: context.active(),
    });
  }

  warn(message) {
    this.logger.emit({
      body: message,
      severity: "WARN",
      context: context.active(),
    });
  }

  debug(message) {
    this.logger.emit({
      body: message,
      severity: "DEBUG",
      context: context.active(),
    });
  }
}

module.exports = new Logger();
