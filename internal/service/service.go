package service

import (
	"context"

	"github.com/Samruddhi-7/orderflow/internal/repository"
	"github.com/Samruddhi-7/orderflow/internal/repository/db"
)

// Service container that groups all business logic services
type Service struct {
	Auth  AuthService
	User  UserService
	Order OrderService
}

// NewService instantiates the business services
func NewService(store repository.Store, jwtSecret string) *Service {
	return &Service{
		Auth:  NewAuthService(store, jwtSecret),
		User:  NewUserService(store),
		Order: NewOrderService(store),
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
	// Order management logic will go here in Phase 3/4
}

type orderService struct {
	store repository.Store
}

func NewOrderService(store repository.Store) OrderService {
	return &orderService{store: store}
}
