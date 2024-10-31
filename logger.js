const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-grpc");
const {
  BatchLogRecordProcessor,
  LoggerProvider,
} = require("@opentelemetry/sdk-logs");
const {loggerProvider} = require("./log_provider");
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
    });
  }

  error(message) {
    this.logger.emit({ body: message, severity: "ERROR" });
  }

  warn(message) {
    this.logger.emit({ body: message, severity: "WARN" });
  }

  debug(message) {
    this.logger.emit({ body: message, severity: "DEBUG" });
  }
}

module.exports = new Logger();