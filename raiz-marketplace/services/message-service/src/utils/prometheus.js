import client from 'prom-client';

// Registrar métrica
const register = new client.Registry();

// Métricas HTTP
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de peticiones HTTP',
  labelNames: ['method', 'route', 'status_code']
});

// Métricas de WebSocket
export const websocketConnections = new client.Gauge({
  name: 'websocket_connections',
  help: 'Cantidad de conexiones WebSocket activas'
});

export const websocketMessagesTotal = new client.Counter({
  name: 'websocket_messages_total',
  help: 'Total de mensajes enviados por WebSocket',
  labelNames: ['event_type']
});

// Métricas de base de datos
export const dbOperationsTotal = new client.Counter({
  name: 'db_operations_total',
  help: 'Total de operaciones de BD',
  labelNames: ['operation', 'table', 'status']
});

export const dbOperationDuration = new client.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Duración de operaciones de BD',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
});

// Registrar todas las métricas
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(websocketConnections);
register.registerMetric(websocketMessagesTotal);
register.registerMetric(dbOperationsTotal);
register.registerMetric(dbOperationDuration);

// Endpoint de métricas
export function getMetrics() {
  return register.metrics();
}

export default register;
