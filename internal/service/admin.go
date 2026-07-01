package service

import (
	"context"

	"github.com/Samruddhi-7/orderflow/internal/repository"
	"github.com/Samruddhi-7/orderflow/internal/repository/db"
)

type AdminService interface {
	GetPlatformAnalytics(ctx context.Context) (db.GetPlatformAnalyticsRow, error)
	ListAllVendors(ctx context.Context) ([]db.Vendor, error)
}

type adminService struct {
	store repository.Store
}

func NewAdminService(store repository.Store) AdminService {
	return &adminService{
		store: store,
	}
}

func (s *adminService) GetPlatformAnalytics(ctx context.Context) (db.GetPlatformAnalyticsRow, error) {
	return s.store.GetPlatformAnalytics(ctx)
}

func (s *adminService) ListAllVendors(ctx context.Context) ([]db.Vendor, error) {
	return s.store.ListVendors(ctx)
}
