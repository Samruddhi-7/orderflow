package service

import (
	"github.com/Samruddhi-7/orderflow/internal/repository"
)

// Service container that groups all business logic services
type Service struct {
	User  UserService
	Order OrderService
}

// NewService instantiates the business services
func NewService(store repository.Store) *Service {
	return &Service{
		User:  NewUserService(store),
		Order: NewOrderService(store),
	}
}

// UserService interface definitions
type UserService interface {
	// CRUD definitions will go here in Phase 2
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
