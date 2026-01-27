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

// Métricas del Circuit Breaker
export const circuitBreakerState = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Estado del circuit breaker (0=CLOSED, 1=OPEN, 2=HALF_OPEN)',
  labelNames: ['service']
});

export const circuitBreakerFailures = new client.Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total de fallos en circuit breaker',
  labelNames: ['service']
});

// Métricas de Rate Limit
export const rateLimitExceeded = new client.Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total de peticiones rechazadas por rate limit',
  labelNames: ['ip']
});

// Métricas de autenticación
export const authFailures = new client.Counter({
  name: 'auth_failures_total',
  help: 'Total de fallos de autenticación',
  labelNames: ['reason']
});

// Registrar todas las métricas
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(circuitBreakerState);
register.registerMetric(circuitBreakerFailures);
register.registerMetric(rateLimitExceeded);
register.registerMetric(authFailures);

// Endpoint de métricas
export function getMetrics() {
  return register.metrics();
}

export default register;
