package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/Samruddhi-7/orderflow/internal/middleware"
	"github.com/Samruddhi-7/orderflow/internal/service"
)

type Handler struct {
	services *service.Service
}

func NewHandler(services *service.Service) *Handler {
	return &Handler{services: services}
}

func (h *Handler) InitRoutes(jwtSecret string) *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORSMiddleware())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
		})
	})

	// API Groups
	api := router.Group("/api/v1")
	{
		// Authentication routes (unauthenticated)
		auth := api.Group("/auth")
		{
			auth.POST("/register", h.register)
			auth.POST("/login", h.login)
			auth.POST("/refresh", h.refresh)
		}

		// Authenticated routes
		authenticated := api.Group("/")
		authenticated.Use(middleware.AuthMiddleware(jwtSecret))
		{
			// Orders
			orders := authenticated.Group("/orders")
			{
				orders.POST("", h.createOrder)
				orders.GET("/:id", h.getOrder)
			}
		}
	}

	return router
}

// Handler stubs for Phase 1 compilation
func (h *Handler) register(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "register endpoint"})
}

func (h *Handler) login(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "login endpoint"})
}

func (h *Handler) refresh(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "refresh endpoint"})
}

func (h *Handler) createOrder(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "create order endpoint"})
}

func (h *Handler) getOrder(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "get order endpoint"})
}
