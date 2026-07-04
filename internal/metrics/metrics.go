package metrics

import (
	"runtime"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests handled, partitioned by method, path, and response status code.",
		},
		[]string{"method", "path", "status_code"},
	)

	HTTPRequestDurationSeconds = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Latency distribution of HTTP requests, partitioned by method and route path.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	OrdersCreatedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "orders_created_total",
			Help: "Total number of orders successfully created.",
		},
	)

	OrderCreationErrorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "order_creation_errors_total",
			Help: "Total number of failed order creation attempts, partitioned by failure reason.",
		},
		[]string{"reason"},
	)

	ActiveGoroutines = promauto.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "active_goroutines",
			Help: "Current number of active goroutines (sampled on scrape).",
		},
		func() float64 {
			return float64(runtime.NumGoroutine())
		},
	)
)
