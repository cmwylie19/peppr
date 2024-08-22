# Metrics Endpoints

The `/metrics` endpoint provides metrics for the application that are collected via the `MetricsCollector` class. It uses the `prom-client` library and performance hooks from Node.js to gather and expose the metrics data in a format that can be scraped by Prometheus.

## Metrics Exposed

The `MetricsCollector` exposes the following metrics:

- `peppr_errors`: A counter that increments when an error event occurs in the application.
- `peppr_alerts`: A counter that increments when an alert event is triggered in the application.
- `peppr_mutate`: A summary that provides the observed durations of mutation events in the application.
- `peppr_validate`: A summary that provides the observed durations of validation events in the application.
- `peppr_cache_miss`: A gauge that provides the number of cache misses per window.
- `peppr_resync_failure_count`: A gauge that provides the number of unsuccessful attempts at receiving an event within the last seen event limit before re-establishing a new connection.

## Environment Variables

| `peppr_MAX_CACHE_MISS_WINDOWS` | Maximum number windows to emit `peppr_cache_miss` metrics for  | default: `Undefined`  |


## API Details

**Method:** GET

**URL:** `/metrics`

**Response Type:** text/plain

**Status Codes:**

- 200 OK: On success, returns the current metrics from the application.

**Response Body:**
The response body is a plain text representation of the metrics data, according to the Prometheus exposition formats. It includes the metrics mentioned above.

## Examples

### Request

```plaintext
GET /metrics
```

### Response

```plaintext
  `# HELP peppr_errors Mutation/Validate errors encountered
  # TYPE peppr_errors counter
  peppr_errors 5

  # HELP peppr_alerts Mutation/Validate bad api token received
  # TYPE peppr_alerts counter
  peppr_alerts 10

  # HELP peppr_mutate Mutation operation summary
  # TYPE peppr_mutate summary
  peppr_mutate{quantile="0.01"} 100.60707900021225
  peppr_mutate{quantile="0.05"} 100.60707900021225
  peppr_mutate{quantile="0.5"} 100.60707900021225
  peppr_mutate{quantile="0.9"} 100.60707900021225
  peppr_mutate{quantile="0.95"} 100.60707900021225
  peppr_mutate{quantile="0.99"} 100.60707900021225
  peppr_mutate{quantile="0.999"} 100.60707900021225
  peppr_mutate_sum 100.60707900021225
  peppr_mutate_count 1

  # HELP peppr_validate Validation operation summary
  # TYPE peppr_validate summary
  peppr_validate{quantile="0.01"} 201.19413900002837
  peppr_validate{quantile="0.05"} 201.19413900002837
  peppr_validate{quantile="0.5"} 201.2137690000236
  peppr_validate{quantile="0.9"} 201.23339900001884
  peppr_validate{quantile="0.95"} 201.23339900001884
  peppr_validate{quantile="0.99"} 201.23339900001884
  peppr_validate{quantile="0.999"} 201.23339900001884
  peppr_validate_sum 402.4275380000472
  peppr_validate_count 2

  # HELP peppr_cache_miss Number of cache misses per window
  # TYPE peppr_cache_miss gauge
  peppr_cache_miss{window="2024-07-25T11:54:33.897Z"} 18
  peppr_cache_miss{window="2024-07-25T12:24:34.592Z"} 0
  peppr_cache_miss{window="2024-07-25T13:14:33.450Z"} 22
  peppr_cache_miss{window="2024-07-25T13:44:34.234Z"} 19
  peppr_cache_miss{window="2024-07-25T14:14:34.961Z"} 0

  # HELP peppr_resync_failure_count Number of retries per count
  # TYPE peppr_resync_failure_count gauge
  peppr_resync_failure_count{count="0"} 5
  peppr_resync_failure_count{count="1"} 4
```

## Prometheus Operator

If using the Prometheus Operator, the following `ServiceMonitor` example manifests can be used to scrape the `/metrics` endpoint for the `admission` and `watcher` controllers.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: admission
spec:
  selector:
    matchLabels:
      peppr.dev/controller: admission
  namespaceSelector:
    matchNames:
    - peppr-system
  endpoints:
  - targetPort: 3000
    scheme: https
    tlsConfig:
      insecureSkipVerify: true
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: watcher
spec:
  selector:
    matchLabels:
      peppr.dev/controller: watcher
  namespaceSelector:
    matchNames:
    - peppr-system
  endpoints:
  - targetPort: 3000
    scheme: https
    tlsConfig:
      insecureSkipVerify: true
```
