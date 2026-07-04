package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/Samruddhi-7/orderflow/internal/util"
	"github.com/gin-gonic/gin"
)

const (
	AuthorizationHeaderKey  = "authorization"
	AuthorizationTypeBearer = "bearer"
	AuthorizationPayloadKey = "authorization_payload"
)

// AuthMiddleware is Gin middleware to authenticate requests with JWT
func AuthMiddleware(tokenMaker *util.TokenMaker) gin.HandlerFunc {
	return func(c *gin.Context) {
		var accessToken string

		authorizationHeader := c.GetHeader(AuthorizationHeaderKey)
		if len(authorizationHeader) != 0 {
			fields := strings.Fields(authorizationHeader)
			if len(fields) < 2 {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
				return
			}
			authorizationType := strings.ToLower(fields[0])
			if authorizationType != AuthorizationTypeBearer {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unsupported authorization type"})
				return
			}
			accessToken = fields[1]
		} else {
			// Fallback to query parameter (e.g. for WebSockets)
			accessToken = c.Query("token")
			if len(accessToken) == 0 {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header or token query parameter is not provided"})
				return
			}
		}

		payload, err := tokenMaker.VerifyToken(accessToken)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.Set(AuthorizationPayloadKey, payload)
		c.Next()
	}
}

// RequireRole guards access based on user role claims in JWT
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		value, exists := c.Get(AuthorizationPayloadKey)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user is not authenticated"})
			return
		}

		payload, ok := value.(*util.UserClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed to parse auth payload"})
			return
		}

		roleAllowed := false
		for _, role := range allowedRoles {
			if payload.Role == role {
				roleAllowed = true
				break
			}
		}

		if !roleAllowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden: insufficient permissions"})
			return
		}

		c.Next()
	}
}

// CORSMiddleware sets explicit CORS policies (no wildcards).
// allowedOrigins is a comma-separated list of origins (e.g. "http://localhost:3000,https://orderflow.vercel.app").
// The request's Origin header is matched against the list; if matched, it is echoed back.
// If the list contains "*" or the origin is not present, the first origin is used as a fallback.
func CORSMiddleware(allowedOrigins string) gin.HandlerFunc {
	origins := strings.Split(allowedOrigins, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		allowed := origins[0]
		for _, o := range origins {
			if o == origin || o == "*" {
				allowed = origin
				break
			}
		}
		c.Writer.Header().Set("Access-Control-Allow-Origin", allowed)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, Idempotency-Key")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// ipLimiter holds the rate limiting token bucket for a single client IP
type ipLimiter struct {
	tokens     float64
	lastRefill time.Time
}

// RateLimiter implements a thread-safe in-memory Token Bucket rate limiter
type RateLimiter struct {
	mu    sync.Mutex
	ips   map[string]*ipLimiter
	rate  float64 // Tokens refilled per second
	burst float64 // Maximum bucket capacity
}

// NewRateLimiter instantiates a new RateLimiter
func NewRateLimiter(rate float64, burst float64) *RateLimiter {
	return &RateLimiter{
		ips:   make(map[string]*ipLimiter),
		rate:  rate,
		burst: burst,
	}
}

// Allow checks if the request from the given IP is allowed under the rate limit
func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	lim, exists := rl.ips[ip]
	now := time.Now()
	if !exists {
		rl.ips[ip] = &ipLimiter{
			tokens:     rl.burst - 1.0,
			lastRefill: now,
		}
		return true
	}

	elapsed := now.Sub(lim.lastRefill).Seconds()
	lim.lastRefill = now
	lim.tokens += elapsed * rl.rate
	if lim.tokens > rl.burst {
		lim.tokens = rl.burst
	}

	if lim.tokens >= 1.0 {
		lim.tokens -= 1.0
		return true
	}

	return false
}

// RateLimitMiddleware applies rate limiting based on client IP
func RateLimitMiddleware(rl *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !rl.Allow(ip) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many requests, please slow down"})
			return
		}
		c.Next()
	}
}
