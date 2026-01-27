import client from 'prom-client';

// Usar el registro global de prom-client (incluye métricas por defecto)
const register = client.register;

// Métricas HTTP
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de peticiones HTTP',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Métricas de base de datos
export const dbOperationsTotal = new client.Counter({
  name: 'db_operations_total',
  help: 'Total de operaciones de BD',
  labelNames: ['operation', 'table', 'status'],
  registers: [register]
});

export const dbOperationDuration = new client.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Duración de operaciones de BD',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

// Endpoint de métricas (async porque register.metrics() devuelve Promise)
export async function getMetrics() {
  return await register.metrics();
}

export default register;
