package handler

import (
	"fmt"
	"net/http"

	"github.com/Samruddhi-7/orderflow/internal/middleware"
	"github.com/Samruddhi-7/orderflow/internal/repository/db"
	"github.com/Samruddhi-7/orderflow/internal/util"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

type createMenuItemRequest struct {
	Name        string  `json:"name" binding:"required"`
	Price       float64 `json:"price" binding:"required,gt=0"`
	StockQty    int32   `json:"stock_qty" binding:"required,min=0"`
	IsAvailable *bool   `json:"is_available" binding:"required"`
}

func (h *Handler) createMenuItem(c *gin.Context) {
	vendorID := c.Param("vendor_id")

	var req createMenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify that the user owns this vendor profile
	payload := c.MustGet(middleware.AuthorizationPayloadKey).(*util.UserClaims)
	vendor, err := h.services.Vendor.GetVendorByID(c.Request.Context(), vendorID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vendor not found"})
		return
	}

	var vendorUserID string
	if vendorIDBytes := vendor.UserID.Bytes; len(vendorIDBytes) == 16 {
		vendorUserID = util.UUIDString(vendorIDBytes)
	}

	if vendorUserID != payload.UserID && payload.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only add menu items to your own vendor profile"})
		return
	}

	var numericPrice pgtype.Numeric
	if err := numericPrice.Scan(fmt.Sprintf("%f", req.Price)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid price format"})
		return
	}

	var pgVendorID pgtype.UUID
	if err := pgVendorID.Scan(vendorID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid vendor id"})
		return
	}

	arg := db.CreateMenuItemParams{
		VendorID:    pgVendorID,
		Name:        req.Name,
		Price:       numericPrice,
		StockQty:    req.StockQty,
		IsAvailable: *req.IsAvailable,
	}

	item, err := h.services.Menu.CreateMenuItem(c.Request.Context(), arg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func (h *Handler) listMenuItems(c *gin.Context) {
	vendorID := c.Param("vendor_id")

	limit := int32(10) // default limit
	page := int32(1)   // default page

	if l := util.ParseQueryInt32(c.Query("limit"), 10); l > 0 && l <= 100 {
		limit = l
	}
	if p := util.ParseQueryInt32(c.Query("page"), 1); p > 0 {
		page = p
	}
	offset := (page - 1) * limit

	items, err := h.services.Menu.ListMenuItemsByVendor(c.Request.Context(), vendorID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, items)
}

type updateMenuStockRequest struct {
	StockQty int32 `json:"stock_qty" binding:"required,min=0"`
}

func (h *Handler) updateMenuStock(c *gin.Context) {
	vendorID := c.Param("vendor_id")
	itemID := c.Param("item_id")

	var req updateMenuStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify that the user owns this vendor profile
	payload := c.MustGet(middleware.AuthorizationPayloadKey).(*util.UserClaims)
	vendor, err := h.services.Vendor.GetVendorByID(c.Request.Context(), vendorID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vendor not found"})
		return
	}

	var vendorUserID string
	if vendorIDBytes := vendor.UserID.Bytes; len(vendorIDBytes) == 16 {
		vendorUserID = util.UUIDString(vendorIDBytes)
	}

	if vendorUserID != payload.UserID && payload.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only update your own vendor's menu"})
		return
	}

	// Verify the item belongs to the vendor
	item, err := h.services.Menu.GetMenuItemByID(c.Request.Context(), itemID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "menu item not found"})
		return
	}

	var itemVendorID string
	if itemVendorIDBytes := item.VendorID.Bytes; len(itemVendorIDBytes) == 16 {
		itemVendorID = util.UUIDString(itemVendorIDBytes)
	}

	if itemVendorID != vendorID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "menu item does not belong to this vendor"})
		return
	}

	updatedItem, err := h.services.Menu.UpdateMenuItemStock(c.Request.Context(), itemID, req.StockQty)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, updatedItem)
}

type updateMenuPriceRequest struct {
	Price float64 `json:"price" binding:"required,gt=0"`
}

func (h *Handler) updateMenuPrice(c *gin.Context) {
	vendorID := c.Param("vendor_id")
	itemID := c.Param("item_id")

	var req updateMenuPriceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify that the user owns this vendor profile
	payload := c.MustGet(middleware.AuthorizationPayloadKey).(*util.UserClaims)
	vendor, err := h.services.Vendor.GetVendorByID(c.Request.Context(), vendorID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vendor not found"})
		return
	}

	var vendorUserID string
	if vendorIDBytes := vendor.UserID.Bytes; len(vendorIDBytes) == 16 {
		vendorUserID = util.UUIDString(vendorIDBytes)
	}

	if vendorUserID != payload.UserID && payload.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only update your own vendor's menu"})
		return
	}

	// Verify the item belongs to the vendor
	item, err := h.services.Menu.GetMenuItemByID(c.Request.Context(), itemID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "menu item not found"})
		return
	}

	var itemVendorID string
	if itemVendorIDBytes := item.VendorID.Bytes; len(itemVendorIDBytes) == 16 {
		itemVendorID = util.UUIDString(itemVendorIDBytes)
	}

	if itemVendorID != vendorID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "menu item does not belong to this vendor"})
		return
	}

	var numericPrice pgtype.Numeric
	if err := numericPrice.Scan(fmt.Sprintf("%f", req.Price)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid price format"})
		return
	}

	updatedItem, err := h.services.Menu.UpdateMenuItemPrice(c.Request.Context(), itemID, numericPrice)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, updatedItem)
}
