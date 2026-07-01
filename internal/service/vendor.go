package service

import (
	"context"
	"fmt"
	"time"

	"github.com/Samruddhi-7/orderflow/internal/cache"
	"github.com/Samruddhi-7/orderflow/internal/repository"
	"github.com/Samruddhi-7/orderflow/internal/repository/db"
	"github.com/jackc/pgx/v5/pgtype"
)

type VendorService interface {
	CreateVendor(ctx context.Context, arg db.CreateVendorParams) (db.Vendor, error)
	GetVendorByID(ctx context.Context, id string) (db.Vendor, error)
	GetVendorByUserID(ctx context.Context, userID string) (db.Vendor, error)
	ListVendors(ctx context.Context) ([]db.Vendor, error)
	UpdateVendorStatus(ctx context.Context, id string, isOpen bool) (db.Vendor, error)
}

type vendorService struct {
	store repository.Store
	cache cache.Cache
}

func NewVendorService(store repository.Store, cacheService cache.Cache) VendorService {
	return &vendorService{
		store: store,
		cache: cacheService,
	}
}

func (s *vendorService) CreateVendor(ctx context.Context, arg db.CreateVendorParams) (db.Vendor, error) {
	vendor, err := s.store.CreateVendor(ctx, arg)
	if err != nil {
		return db.Vendor{}, err
	}
	
	// Invalidate the list of vendors
	_ = s.cache.Delete(ctx, "vendors:list")
	return vendor, nil
}

func (s *vendorService) GetVendorByID(ctx context.Context, id string) (db.Vendor, error) {
	cacheKey := fmt.Sprintf("vendors:detail:%s", id)
	var vendor db.Vendor

	// Try to get from cache first
	if err := s.cache.Get(ctx, cacheKey, &vendor); err == nil {
		return vendor, nil
	}

	var uuid pgtype.UUID
	if err := uuid.Scan(id); err != nil {
		return db.Vendor{}, err
	}

	vendor, err := s.store.GetVendorByID(ctx, uuid)
	if err != nil {
		return db.Vendor{}, err
	}

	// Set in cache with 10 mins TTL
	_ = s.cache.Set(ctx, cacheKey, vendor, 10*time.Minute)
	return vendor, nil
}

func (s *vendorService) GetVendorByUserID(ctx context.Context, userID string) (db.Vendor, error) {
	var uuid pgtype.UUID
	if err := uuid.Scan(userID); err != nil {
		return db.Vendor{}, err
	}

	return s.store.GetVendorByUserID(ctx, uuid)
}

func (s *vendorService) ListVendors(ctx context.Context) ([]db.Vendor, error) {
	cacheKey := "vendors:list"
	var vendors []db.Vendor

	// Try to get from cache first
	if err := s.cache.Get(ctx, cacheKey, &vendors); err == nil {
		return vendors, nil
	}

	vendors, err := s.store.ListVendors(ctx)
	if err != nil {
		return nil, err
	}

	// Set in cache with 5 mins TTL
	_ = s.cache.Set(ctx, cacheKey, vendors, 5*time.Minute)
	return vendors, nil
}

func (s *vendorService) UpdateVendorStatus(ctx context.Context, id string, isOpen bool) (db.Vendor, error) {
	var uuid pgtype.UUID
	if err := uuid.Scan(id); err != nil {
		return db.Vendor{}, err
	}

	arg := db.UpdateVendorStatusParams{
		ID:     uuid,
		IsOpen: isOpen,
	}

	vendor, err := s.store.UpdateVendorStatus(ctx, arg)
	if err != nil {
		return db.Vendor{}, err
	}

	// Invalidate both the list and the specific vendor detail cache
	cacheKey := fmt.Sprintf("vendors:detail:%s", id)
	_ = s.cache.Delete(ctx, "vendors:list", cacheKey)

	return vendor, nil
}
