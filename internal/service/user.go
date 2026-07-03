package service

import (
	"context"

	"github.com/Samruddhi-7/orderflow/internal/repository/db"
	"github.com/jackc/pgx/v5/pgtype"
)

func (s *userService) GetUserByID(ctx context.Context, id string) (db.User, error) {
	var pgUUID pgtype.UUID
	err := pgUUID.Scan(id)
	if err != nil {
		return db.User{}, err
	}
	return s.store.GetUserByID(ctx, pgUUID)
}
