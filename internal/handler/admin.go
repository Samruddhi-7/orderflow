package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) getPlatformAnalytics(c *gin.Context) {
	analytics, err := h.services.Admin.GetPlatformAnalytics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, analytics)
}

func (h *Handler) getAdminVendors(c *gin.Context) {
	vendors, err := h.services.Admin.ListAllVendors(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, vendors)
}
