package service

import (
	"context"

	"github.com/Samruddhi-7/orderflow/internal/cache"
	"github.com/Samruddhi-7/orderflow/internal/repository"
	"github.com/Samruddhi-7/orderflow/internal/repository/db"
)

// Service container that groups all business logic services
type Service struct {
	Auth   AuthService
	User   UserService
	Vendor VendorService
	Menu   MenuService
	Order  OrderService
}

// NewService instantiates the business services
func NewService(store repository.Store, cacheService cache.Cache, jwtSecret string) *Service {
	return &Service{
		Auth:   NewAuthService(store, jwtSecret),
		User:   NewUserService(store),
		Vendor: NewVendorService(store, cacheService),
		Menu:   NewMenuService(store, cacheService),
		Order:  NewOrderService(store, cacheService),
	}
}

// AuthService handles authentication, registration, token generation and refresh
type AuthService interface {
	Register(ctx context.Context, email string, password string, role string) (db.User, error)
	Login(ctx context.Context, email string, password string) (string, string, error)
	Refresh(ctx context.Context, refreshToken string) (string, string, error)
	Logout(ctx context.Context, refreshToken string) error
}

// UserService interface definitions
type UserService interface {
	GetUserByID(ctx context.Context, id string) (db.User, error)
}

type userService struct {
	store repository.Store
}

func NewUserService(store repository.Store) UserService {
	return &userService{store: store}
}

// OrderService interface definitions
type OrderService interface {
	CreateOrder(ctx context.Context, req CreateOrderRequest) (db.Order, error)
	GetOrder(ctx context.Context, orderID string) (db.Order, error)
	ListOrdersByCustomer(ctx context.Context, customerID string) ([]db.Order, error)
	ListOrdersByVendor(ctx context.Context, vendorID string) ([]db.Order, error)
	UpdateOrderStatus(ctx context.Context, orderID string, status string) (db.Order, error)
}

type orderService struct {
	store repository.Store
	cache cache.Cache
}

func NewOrderService(store repository.Store, cacheService cache.Cache) OrderService {
	return &orderService{store: store, cache: cacheService}
}
