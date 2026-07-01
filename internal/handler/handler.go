package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/Samruddhi-7/orderflow/internal/middleware"
	"github.com/Samruddhi-7/orderflow/internal/service"
	"github.com/Samruddhi-7/orderflow/internal/util"
)

type Handler struct {
	services   *service.Service
	tokenMaker *util.TokenMaker
}

func NewHandler(services *service.Service, tokenMaker *util.TokenMaker) *Handler {
	return &Handler{
		services:   services,
		tokenMaker: tokenMaker,
	}
}

func (h *Handler) InitRoutes(allowedOrigin string) *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORSMiddleware(allowedOrigin))

	// Rate limiter for Auth endpoints (e.g., 5 requests per second limit, burst of 10)
	authRateLimiter := middleware.NewRateLimiter(5.0, 10.0)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
		})
	})

	api := router.Group("/api/v1")
	{
		// Authentication group (rate-limited)
		auth := api.Group("/auth")
		auth.Use(middleware.RateLimitMiddleware(authRateLimiter))
		{
			auth.POST("/register", h.register)
			auth.POST("/login", h.login)
			auth.POST("/refresh", h.refresh)
			auth.POST("/logout", h.logout)
		}

		// Authenticated routes
		authenticated := api.Group("/")
		authenticated.Use(middleware.AuthMiddleware(h.tokenMaker))
		{
			// Example vendor-only route
			vendorsOnly := authenticated.Group("/vendors")
			vendorsOnly.Use(middleware.RequireRole("vendor", "admin"))
			{
				vendorsOnly.GET("/orders", func(c *gin.Context) {
					c.JSON(http.StatusOK, gin.H{"message": "Welcome Vendor! This is your orders board."})
				})
			}

			// Orders routes
			orders := authenticated.Group("/orders")
			{
				orders.POST("", h.createOrder)
				orders.GET("/:id", h.getOrder)
			}
		}
	}

	return router
}

// Temporary order handlers (will be fully implemented in later phases)
func (h *Handler) createOrder(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "create order endpoint"})
}

func (h *Handler) getOrder(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "get order endpoint"})
}
