package handler

import (
	"net/http"

	"github.com/Samruddhi-7/orderflow/internal/middleware"
	"github.com/Samruddhi-7/orderflow/internal/service"
	"github.com/Samruddhi-7/orderflow/internal/util"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
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

func (h *Handler) InitRoutes(allowedOrigins string, orderRateLimit float64, orderBurst int) *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORSMiddleware(allowedOrigins))
	router.Use(middleware.MetricsMiddleware())

	// Expose Prometheus metrics on an unauthenticated route.
	// In a production deployment this would typically be firewalled or served on
	// a separate internal port rather than exposed publicly.
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Rate limiter for Auth endpoints (e.g., 5 requests per second limit, burst of 10)
	authRateLimiter := middleware.NewRateLimiter(5.0, 10.0)

	// Rate limiter for Orders (token bucket: configurable via env, default 2 req/s burst 5)
	orderRateLimiter := middleware.NewOrderRateLimiter(orderRateLimit, orderBurst)

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
			// Vendor routes
			vendors := authenticated.Group("/vendors")
			{
				vendors.GET("", h.listVendors)
				vendors.GET("/:vendor_id", h.getVendor)
				vendors.GET("/:vendor_id/menu", h.listMenuItems)

				// Vendor-only mutations
				vendorOnly := vendors.Group("")
				vendorOnly.Use(middleware.RequireRole("vendor", "admin"))
				{
					vendorOnly.POST("", h.createVendor)
					vendorOnly.PATCH("/:vendor_id/status", h.updateVendorStatus)

					vendorOnly.POST("/:vendor_id/menu", h.createMenuItem)
					vendorOnly.PATCH("/:vendor_id/menu/:item_id/price", h.updateMenuPrice)
					vendorOnly.PATCH("/:vendor_id/menu/:item_id/stock", h.updateMenuStock)
				}
			}

			// Orders routes
			orders := authenticated.Group("/orders")
			{
				orders.GET("", h.listOrders)
				orders.GET("/:id", h.getOrder)
				orders.GET("/:id/track", h.trackOrderWS)

				// Rate limited order placement
				orders.POST("", middleware.RateLimitOrder(orderRateLimiter), h.createOrder)

				// Vendor only order mutations
				vendorOnlyOrders := orders.Group("")
				vendorOnlyOrders.Use(middleware.RequireRole("vendor", "admin"))
				{
					vendorOnlyOrders.PATCH("/:id/status", h.updateOrderStatus)
				}
			}

			// Admin routes
			admin := authenticated.Group("/admin")
			admin.Use(middleware.RequireRole("admin"))
			{
				admin.GET("/analytics", h.getPlatformAnalytics)
				admin.GET("/vendors", h.getAdminVendors)
			}
		}
	}

	return router
}
