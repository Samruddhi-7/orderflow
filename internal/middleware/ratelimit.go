package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/Samruddhi-7/orderflow/internal/util"
	"github.com/gin-gonic/gin"
)

type TokenBucket struct {
	capacity int
	tokens   float64
	rate     float64 // tokens per second
	lastTime time.Time
	mu       sync.Mutex
}

func (tb *TokenBucket) Allow() bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(tb.lastTime).Seconds()
	tb.tokens += elapsed * tb.rate
	if tb.tokens > float64(tb.capacity) {
		tb.tokens = float64(tb.capacity)
	}
	tb.lastTime = now

	if tb.tokens >= 1 {
		tb.tokens--
		return true
	}
	return false
}

type RateLimiter struct {
	buckets map[string]*TokenBucket
	mu      sync.Mutex
	rate    float64
	cap     int
}

func NewRateLimiter(r float64, c int) *RateLimiter {
	return &RateLimiter{
		buckets: make(map[string]*TokenBucket),
		rate:    r,
		cap:     c,
	}
}

func (rl *RateLimiter) getBucket(key string) *TokenBucket {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	if bucket, exists := rl.buckets[key]; exists {
		return bucket
	}

	bucket := &TokenBucket{
		capacity: rl.cap,
		tokens:   float64(rl.cap),
		rate:     rl.rate,
		lastTime: time.Now(),
	}
	rl.buckets[key] = bucket
	return bucket
}

func RateLimitOrder(rl *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		payload, exists := c.Get(AuthorizationPayloadKey)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		claims := payload.(*util.UserClaims)
		userID := claims.UserID.String()

		bucket := rl.getBucket(userID)
		if !bucket.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded for order placement"})
			return
		}

		c.Next()
	}
}
