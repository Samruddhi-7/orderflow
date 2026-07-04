package middleware

import (
	"strconv"
	"time"

	"github.com/Samruddhi-7/orderflow/internal/metrics"
	"github.com/gin-gonic/gin"
)

// MetricsMiddleware records http_requests_total and
// http_request_duration_seconds for every request that passes through it.
// It uses c.FullPath() to avoid cardinality explosion from path parameters
// (e.g. /orders/:id instead of /orders/some-uuid).
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		status := strconv.Itoa(c.Writer.Status())
		method := c.Request.Method
		path := c.FullPath()
		if path == "" {
			path = "unknown"
		}

		metrics.HTTPRequestsTotal.WithLabelValues(method, path, status).Inc()
		metrics.HTTPRequestDurationSeconds.WithLabelValues(method, path).Observe(time.Since(start).Seconds())
	}
}
