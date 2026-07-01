package handler

import (
	"net/http"

	"github.com/Samruddhi-7/orderflow/internal/middleware"
	"github.com/Samruddhi-7/orderflow/internal/repository/db"
	"github.com/Samruddhi-7/orderflow/internal/util"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

type createVendorRequest struct {
	Name    string `json:"name" binding:"required"`
	Address string `json:"address" binding:"required"`
	IsOpen  bool   `json:"is_open"`
}

func (h *Handler) createVendor(c *gin.Context) {
	var req createVendorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payload := c.MustGet(middleware.AuthorizationPayloadKey).(*util.UserClaims)
	
	// Create UUID for the user id from token
	var userID pgtype.UUID
	if err := userID.Scan(payload.UserID.String()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user id"})
		return
	}

	arg := db.CreateVendorParams{
		UserID:  userID,
		Name:    req.Name,
		Address: req.Address,
		IsOpen:  req.IsOpen,
	}

	vendor, err := h.services.Vendor.CreateVendor(c.Request.Context(), arg)
	if err != nil {
		// Could check for unique constraint violation here (e.g. user already has a vendor profile)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, vendor)
}

func (h *Handler) getVendor(c *gin.Context) {
	id := c.Param("id")
	
	vendor, err := h.services.Vendor.GetVendorByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vendor not found"})
		return
	}

	c.JSON(http.StatusOK, vendor)
}

func (h *Handler) listVendors(c *gin.Context) {
	vendors, err := h.services.Vendor.ListVendors(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, vendors)
}

type updateVendorStatusRequest struct {
	IsOpen bool `json:"is_open"`
}

func (h *Handler) updateVendorStatus(c *gin.Context) {
	id := c.Param("id")

	var req updateVendorStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify that the user owns this vendor profile
	payload := c.MustGet(middleware.AuthorizationPayloadKey).(*util.UserClaims)
	vendor, err := h.services.Vendor.GetVendorByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vendor not found"})
		return
	}

	var vendorUserID string
	if vendorIDBytes := vendor.UserID.Bytes; len(vendorIDBytes) == 16 {
		vendorUserID = util.UUIDString(vendorIDBytes)
	}

	if vendorUserID != payload.UserID.String() && payload.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only update your own vendor profile"})
		return
	}

	updatedVendor, err := h.services.Vendor.UpdateVendorStatus(c.Request.Context(), id, req.IsOpen)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, updatedVendor)
}
