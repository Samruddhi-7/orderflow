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

type MenuService interface {
	CreateMenuItem(ctx context.Context, arg db.CreateMenuItemParams) (db.MenuItem, error)
	GetMenuItemByID(ctx context.Context, id string) (db.MenuItem, error)
	ListMenuItemsByVendor(ctx context.Context, vendorID string, limit, offset int32) ([]db.MenuItem, error)
	UpdateMenuItemStock(ctx context.Context, id string, stockQty int32) (db.MenuItem, error)
	UpdateMenuItemPrice(ctx context.Context, id string, price pgtype.Numeric) (db.MenuItem, error)
}

type menuService struct {
	store repository.Store
	cache cache.Cache
}

func NewMenuService(store repository.Store, cacheService cache.Cache) MenuService {
	return &menuService{
		store: store,
		cache: cacheService,
	}
}

func (s *menuService) CreateMenuItem(ctx context.Context, arg db.CreateMenuItemParams) (db.MenuItem, error) {
	item, err := s.store.CreateMenuItem(ctx, arg)
	if err != nil {
		return db.MenuItem{}, err
	}

	// Invalidate the vendor's menu cache

	// Format of uuid string representation in go pgx is usually just hex, or we can format it properly.
	// Since we know pgtype.UUID can be formatted, let's just use the string value if we can.
	// Alternatively, we invalidate using the string representation passed elsewhere or parsed.
	vendorIDBytes := arg.VendorID.Bytes
	vID := fmt.Sprintf("%x-%x-%x-%x-%x", vendorIDBytes[0:4], vendorIDBytes[4:6], vendorIDBytes[6:8], vendorIDBytes[8:10], vendorIDBytes[10:16])
	_ = s.cache.DeleteByPrefix(ctx, fmt.Sprintf("vendors:%s:menu", vID))

	return item, nil
}

func (s *menuService) GetMenuItemByID(ctx context.Context, id string) (db.MenuItem, error) {
	var uuid pgtype.UUID
	if err := uuid.Scan(id); err != nil {
		return db.MenuItem{}, err
	}
	return s.store.GetMenuItemByID(ctx, uuid)
}

func (s *menuService) ListMenuItemsByVendor(ctx context.Context, vendorID string, limit, offset int32) ([]db.MenuItem, error) {
	cacheKey := fmt.Sprintf("vendors:%s:menu:limit:%d:offset:%d", vendorID, limit, offset)
	var items []db.MenuItem

	// Try cache
	if err := s.cache.Get(ctx, cacheKey, &items); err == nil {
		return items, nil
	}

	var uuid pgtype.UUID
	if err := uuid.Scan(vendorID); err != nil {
		return nil, err
	}

	arg := db.ListMenuItemsByVendorParams{
		VendorID: uuid,
		Limit:    limit,
		Offset:   offset,
	}

	items, err := s.store.ListMenuItemsByVendor(ctx, arg)
	if err != nil {
		return nil, err
	}

	// Cache it
	_ = s.cache.Set(ctx, cacheKey, items, 10*time.Minute)
	return items, nil
}

func (s *menuService) UpdateMenuItemStock(ctx context.Context, id string, stockQty int32) (db.MenuItem, error) {
	var uuid pgtype.UUID
	if err := uuid.Scan(id); err != nil {
		return db.MenuItem{}, err
	}

	arg := db.UpdateMenuItemStockParams{
		ID:       uuid,
		StockQty: stockQty,
	}

	item, err := s.store.UpdateMenuItemStock(ctx, arg)
	if err != nil {
		return db.MenuItem{}, err
	}

	// Invalidate the vendor's menu cache
	vendorIDBytes := item.VendorID.Bytes
	vID := fmt.Sprintf("%x-%x-%x-%x-%x", vendorIDBytes[0:4], vendorIDBytes[4:6], vendorIDBytes[6:8], vendorIDBytes[8:10], vendorIDBytes[10:16])
	_ = s.cache.DeleteByPrefix(ctx, fmt.Sprintf("vendors:%s:menu", vID))

	return item, nil
}

func (s *menuService) UpdateMenuItemPrice(ctx context.Context, id string, price pgtype.Numeric) (db.MenuItem, error) {
	var uuid pgtype.UUID
	if err := uuid.Scan(id); err != nil {
		return db.MenuItem{}, err
	}

	arg := db.UpdateMenuItemPriceParams{
		ID:    uuid,
		Price: price,
	}

	item, err := s.store.UpdateMenuItemPrice(ctx, arg)
	if err != nil {
		return db.MenuItem{}, err
	}

	// Invalidate the vendor's menu cache
	vendorIDBytes := item.VendorID.Bytes
	vID := fmt.Sprintf("%x-%x-%x-%x-%x", vendorIDBytes[0:4], vendorIDBytes[4:6], vendorIDBytes[6:8], vendorIDBytes[8:10], vendorIDBytes[10:16])
	_ = s.cache.DeleteByPrefix(ctx, fmt.Sprintf("vendors:%s:menu", vID))

	return item, nil
}
