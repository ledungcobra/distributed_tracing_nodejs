const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-grpc");
const {
  BatchLogRecordProcessor,
  LoggerProvider,
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor,
} = require("@opentelemetry/sdk-logs");

const { diag, DiagConsoleLogger, DiagLogLevel } = require("@opentelemetry/api");

class Logger {
  constructor() {
    const loggerExporter = new OTLPLogExporter({
      url: "http://localhost:4317",
    });

    // Set the global logger to log at debug level
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
    const resource = {
      attributes: {
        "service.name": "logger-service",
      },
    };

    const loggerProvider = new LoggerProvider({ resource });

    loggerProvider.addLogRecordProcessor(
      new BatchLogRecordProcessor(loggerExporter)
    );

    loggerProvider.addLogRecordProcessor(
      new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
    );

    this.logger = loggerProvider.getLogger("example-logger");
  }

  info(message) {
    this.logger.emit({ body: message, severity: "INFO" });
    console.log(message);
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
