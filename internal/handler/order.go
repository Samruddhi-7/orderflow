package handler

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/Samruddhi-7/orderflow/internal/middleware"
	"github.com/Samruddhi-7/orderflow/internal/service"
	"github.com/Samruddhi-7/orderflow/internal/util"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for the demo
	},
}

type OrderBroadcaster struct {
	sync.RWMutex
	clients map[string]map[*websocket.Conn]bool
}

var broadcaster = &OrderBroadcaster{
	clients: make(map[string]map[*websocket.Conn]bool),
}

func (b *OrderBroadcaster) Register(orderID string, conn *websocket.Conn) {
	b.Lock()
	defer b.Unlock()
	if b.clients[orderID] == nil {
		b.clients[orderID] = make(map[*websocket.Conn]bool)
	}
	b.clients[orderID][conn] = true
}

func (b *OrderBroadcaster) Unregister(orderID string, conn *websocket.Conn) {
	b.Lock()
	defer b.Unlock()
	if b.clients[orderID] != nil {
		delete(b.clients[orderID], conn)
		if len(b.clients[orderID]) == 0 {
			delete(b.clients, orderID)
		}
	}
}

func (b *OrderBroadcaster) BroadcastStatus(orderID string, status string) {
	b.RLock()
	defer b.RUnlock()
	if conns, ok := b.clients[orderID]; ok {
		msg, _ := json.Marshal(map[string]string{
			"order_id": orderID,
			"status":   status,
		})
		for conn := range conns {
			_ = conn.WriteMessage(websocket.TextMessage, msg)
		}
	}
}

type orderItemRequest struct {
	MenuItemID string `json:"menu_item_id" binding:"required"`
	Qty        int32  `json:"qty" binding:"required,gt=0"`
}

type createOrderRequest struct {
	VendorID     string             `json:"vendor_id" binding:"required"`
	Items        []orderItemRequest `json:"items" binding:"required,min=1"`
	UseRedisLock bool               `json:"use_redis_lock"`
}

func (h *Handler) createOrder(c *gin.Context) {
	var req createOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	idempotencyKey := c.GetHeader("Idempotency-Key")
	if idempotencyKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Idempotency-Key header is required"})
		return
	}

	payload := c.MustGet(middleware.AuthorizationPayloadKey).(*util.UserClaims)

	itemsMap := make(map[string]int32)
	for _, item := range req.Items {
		itemsMap[item.MenuItemID] += item.Qty
	}

	orderReq := service.CreateOrderRequest{
		CustomerID:     payload.UserID,
		VendorID:       req.VendorID,
		Items:          itemsMap,
		IdempotencyKey: idempotencyKey,
		UseRedisLock:   req.UseRedisLock,
	}

	order, err := h.services.Order.CreateOrder(c.Request.Context(), orderReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, order)
}

func (h *Handler) getOrder(c *gin.Context) {
	orderID := c.Param("id")
	
	order, err := h.services.Order.GetOrder(c.Request.Context(), orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	payload := c.MustGet(middleware.AuthorizationPayloadKey).(*util.UserClaims)
	
	// Role scoping: only customer or vendor involved in the order can view it
	var customerIDStr string
	if len(order.CustomerID.Bytes) == 16 {
		customerIDStr = util.UUIDString(order.CustomerID.Bytes)
	}

	var vendorIDStr string
	if len(order.VendorID.Bytes) == 16 {
		vendorIDStr = util.UUIDString(order.VendorID.Bytes)
	}

	if payload.Role == "customer" && payload.UserID != customerIDStr {
		c.JSON(http.StatusForbidden, gin.H{"error": "unauthorized"})
		return
	}

	if payload.Role == "vendor" {
		// Verify the logged-in vendor owns this vendor profile
		vendor, vendorErr := h.services.Vendor.GetVendorByID(c.Request.Context(), vendorIDStr)
		if vendorErr != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "unauthorized"})
			return
		}
		var ownerIDStr string
		if len(vendor.UserID.Bytes) == 16 {
			ownerIDStr = util.UUIDString(vendor.UserID.Bytes)
		}
		if ownerIDStr != payload.UserID {
			c.JSON(http.StatusForbidden, gin.H{"error": "unauthorized"})
			return
		}
	}

	c.JSON(http.StatusOK, order)
}

func (h *Handler) listOrders(c *gin.Context) {
	payload := c.MustGet(middleware.AuthorizationPayloadKey).(*util.UserClaims)

	if payload.Role == "customer" {
		orders, err := h.services.Order.ListOrdersByCustomer(c.Request.Context(), payload.UserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, orders)
		return
	}

	if payload.Role == "vendor" {
		// Vendor needs to list incoming orders for their vendor profile
		vendor, err := h.services.Vendor.GetVendorByUserID(c.Request.Context(), payload.UserID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "vendor profile not found"})
			return
		}
		
		var vendorIDStr string
		if len(vendor.ID.Bytes) == 16 {
			vendorIDStr = util.UUIDString(vendor.ID.Bytes)
		}

		orders, err := h.services.Order.ListOrdersByVendor(c.Request.Context(), vendorIDStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, orders)
		return
	}

	c.JSON(http.StatusForbidden, gin.H{"error": "unauthorized role"})
}

type updateOrderStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

func (h *Handler) updateOrderStatus(c *gin.Context) {
	orderID := c.Param("id")
	
	var req updateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payload := c.MustGet(middleware.AuthorizationPayloadKey).(*util.UserClaims)
	
	order, err := h.services.Order.GetOrder(c.Request.Context(), orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	var vendorIDStr string
	if len(order.VendorID.Bytes) == 16 {
		vendorIDStr = util.UUIDString(order.VendorID.Bytes)
	}

	vendor, err := h.services.Vendor.GetVendorByID(c.Request.Context(), vendorIDStr)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "unauthorized"})
		return
	}
	
	var ownerIDStr string
	if len(vendor.UserID.Bytes) == 16 {
		ownerIDStr = util.UUIDString(vendor.UserID.Bytes)
	}

	if payload.Role != "admin" && ownerIDStr != payload.UserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the vendor can update their orders"})
		return
	}

	updatedOrder, err := h.services.Order.UpdateOrderStatus(c.Request.Context(), orderID, req.Status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Broadcast WS update
	broadcaster.BroadcastStatus(orderID, updatedOrder.Status)

	c.JSON(http.StatusOK, updatedOrder)
}

func (h *Handler) trackOrderWS(c *gin.Context) {
	orderID := c.Param("id")
	payload := c.MustGet(middleware.AuthorizationPayloadKey).(*util.UserClaims)

	order, err := h.services.Order.GetOrder(c.Request.Context(), orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	var customerIDStr string
	if len(order.CustomerID.Bytes) == 16 {
		customerIDStr = util.UUIDString(order.CustomerID.Bytes)
	}

	var vendorIDStr string
	if len(order.VendorID.Bytes) == 16 {
		vendorIDStr = util.UUIDString(order.VendorID.Bytes)
	}

	if payload.Role == "customer" && payload.UserID != customerIDStr {
		c.JSON(http.StatusForbidden, gin.H{"error": "unauthorized"})
		return
	}

	if payload.Role == "vendor" {
		vendor, vendorErr := h.services.Vendor.GetVendorByID(c.Request.Context(), vendorIDStr)
		if vendorErr != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "unauthorized"})
			return
		}
		var ownerIDStr string
		if len(vendor.UserID.Bytes) == 16 {
			ownerIDStr = util.UUIDString(vendor.UserID.Bytes)
		}
		if ownerIDStr != payload.UserID {
			c.JSON(http.StatusForbidden, gin.H{"error": "unauthorized"})
			return
		}
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	broadcaster.Register(orderID, conn)
	defer broadcaster.Unregister(orderID, conn)

	// Keep connection alive until client disconnects
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}
