package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Samruddhi-7/orderflow/internal/middleware"
	"github.com/Samruddhi-7/orderflow/internal/util"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestRequireRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		userRole       string
		requiredRoles  []string
		expectedStatus int
	}{
		{
			name:           "allow admin to access admin route",
			userRole:       "admin",
			requiredRoles:  []string{"admin"},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "allow vendor to access vendor route",
			userRole:       "vendor",
			requiredRoles:  []string{"vendor", "admin"},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "deny customer to access vendor route",
			userRole:       "customer",
			requiredRoles:  []string{"vendor", "admin"},
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			router := gin.New()

			// Mock auth middleware to inject role
			router.Use(func(c *gin.Context) {
				userID, _ := uuid.NewRandom()
				claims := &util.UserClaims{
					UserID: userID.String(),
					Role:   tc.userRole,
				}
				c.Set(middleware.AuthorizationPayloadKey, claims)
				c.Next()
			})

			// Add the role middleware
			router.Use(middleware.RequireRole(tc.requiredRoles...))

			// Add a dummy handler
			router.GET("/test", func(c *gin.Context) {
				c.Status(http.StatusOK)
			})

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tc.expectedStatus {
				t.Errorf("expected status %d, got %d", tc.expectedStatus, w.Code)
			}
		})
	}
}
