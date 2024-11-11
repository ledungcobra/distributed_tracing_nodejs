import { ColorModeScript } from '@chakra-ui/react';
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { context, trace } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { Resource } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  WebTracerProvider,
} from '@opentelemetry/sdk-trace-web';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorker from './serviceWorker';

import {
  FaroSessionSpanProcessor,
  FaroTraceExporter,
  TracingInstrumentation,
} from '@grafana/faro-web-tracing';

const VERSION = '1.0.0';
const NAME = 'frontend';
const COLLECTOR_URL = 'http://localhost:12346/collect';

// initialize faro
const faro = initializeFaro({
  url: COLLECTOR_URL,
  apiKey: 'app-key',
  app: {
    name: NAME,
    version: VERSION,
  },
  instrumentations: [
    ...getWebInstrumentations({
      captureConsole: true,
    }),
    // ...getDefaultOTELInstrumentations(),
    // Mandatory, initialization of the tracing package
    new TracingInstrumentation({
      instrumentationOptions: {
        propagateTraceHeaderCorsUrls: [new RegExp('http://localhost:4000/.*')],
      },
    }),
  ],
});

// set up otel
const resource = Resource.default().merge(
  new Resource({
    [SEMRESATTRS_SERVICE_NAME]: NAME,
    [SEMRESATTRS_SERVICE_VERSION]: VERSION,
  })
);

const provider = new WebTracerProvider({ resource });

provider.addSpanProcessor(
  new FaroSessionSpanProcessor(
    new BatchSpanProcessor(new FaroTraceExporter({ ...faro })),
    faro.metas
  )
);

provider.register({
  propagator: new W3CTraceContextPropagator(),
  contextManager: new ZoneContextManager(),
});

const ignoreUrls = [COLLECTOR_URL];

// Please be aware that this instrumentation originates from OpenTelemetry
// and cannot be used directly in the initializeFaro instrumentations options.
// If you wish to configure these instrumentations using the initializeFaro function,
// please utilize the instrumentations options within the TracingInstrumentation class.
// registerInstrumentations({
//   instrumentations: [
//     new DocumentLoadInstrumentation(),
//     new FetchInstrumentation({ ignoreUrls }),
//     new XMLHttpRequestInstrumentation({ ignoreUrls }),
//     // ...getWebInstrumentations(),
//     new TracingInstrumentation(),
//   ],
// });

// register OTel with Faro
faro.api.initOTEL(trace, context);

// const faro = initializeFaro({
//   url: 'http://localhost:12346/collect',

//   apiKey: 'app-key',
//   app: {
//     name: 'frontend',
//     version: '1.0.0',
//   },
//   // user,

//   instrumentations: [
//     // Mandatory, omits default instrumentations otherwise.
//     ...getWebInstrumentations(),

//     // Tracing package to get end-to-end visibility for HTTP requests.
//     new TracingInstrumentation(),
//   ],
// });

// faro.api.pushLog({
//   severity: 'info',
//   message: 'Hello, world!',
//   args: [],
// });

const tracer = faro.api.getOTEL()?.trace.getTracer('default');
if (!tracer) {
  console.warn('No tracer found');
} else {
  tracer.startActiveSpan('test', span => {
    console.log('test log');
    fetch('http://localhost:4000/send/aaaaaa').finally(() => span.end());
  });
}

console.warn('Hello, world!');

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <StrictMode>
    <ColorModeScript />
    <App />
  </StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorker.unregister();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
