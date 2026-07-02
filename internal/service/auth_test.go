package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/Samruddhi-7/orderflow/internal/repository/db"
)

type mockStore struct {
	db.Querier
	users             map[string]db.User
	refreshTokens     map[string]db.RefreshToken
	revokeAllCalled   map[string]int
	revokeTokenCalled map[string]int
}

func newMockStore() *mockStore {
	return &mockStore{
		users:             make(map[string]db.User),
		refreshTokens:     make(map[string]db.RefreshToken),
		revokeAllCalled:   make(map[string]int),
		revokeTokenCalled: make(map[string]int),
	}
}

func (m *mockStore) ExecTx(ctx context.Context, fn func(*db.Queries) error) error {
	return nil
}

func (m *mockStore) CreateUser(ctx context.Context, arg db.CreateUserParams) (db.User, error) {
	var id pgtype.UUID
	id.Valid = true
	// Mock a fixed UUID byte sequence for testing
	copy(id.Bytes[:], "1234567890123456")

	user := db.User{
		ID:           id,
		Email:        arg.Email,
		PasswordHash: arg.PasswordHash,
		Role:         arg.Role,
		CreatedAt:    pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	m.users[arg.Email] = user
	m.users[uuidToString(id)] = user
	return user, nil
}

func (m *mockStore) GetUserByEmail(ctx context.Context, email string) (db.User, error) {
	u, ok := m.users[email]
	if !ok {
		return db.User{}, errors.New("user not found")
	}
	return u, nil
}

func (m *mockStore) GetUserByID(ctx context.Context, id pgtype.UUID) (db.User, error) {
	u, ok := m.users[uuidToString(id)]
	if !ok {
		return db.User{}, errors.New("user not found")
	}
	return u, nil
}

func (m *mockStore) CreateRefreshToken(ctx context.Context, arg db.CreateRefreshTokenParams) (db.RefreshToken, error) {
	var id pgtype.UUID
	id.Valid = true
	copy(id.Bytes[:], "refresh_token_id")

	token := db.RefreshToken{
		ID:        id,
		UserID:    arg.UserID,
		TokenHash: arg.TokenHash,
		ExpiresAt: arg.ExpiresAt,
		Revoked:   false,
	}
	m.refreshTokens[arg.TokenHash] = token
	return token, nil
}

func (m *mockStore) GetRefreshTokenByHash(ctx context.Context, tokenHash string) (db.RefreshToken, error) {
	t, ok := m.refreshTokens[tokenHash]
	if !ok {
		return db.RefreshToken{}, errors.New("token not found")
	}
	return t, nil
}

func (m *mockStore) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	m.revokeTokenCalled[tokenHash]++
	t, ok := m.refreshTokens[tokenHash]
	if ok {
		t.Revoked = true
		m.refreshTokens[tokenHash] = t
	}
	return nil
}

func (m *mockStore) RevokeAllUserTokens(ctx context.Context, userID pgtype.UUID) error {
	uidStr := uuidToString(userID)
	m.revokeAllCalled[uidStr]++
	
	// Mark all tokens belonging to user as revoked
	for hash, token := range m.refreshTokens {
		if uuidToString(token.UserID) == uidStr {
			token.Revoked = true
			m.refreshTokens[hash] = token
		}
	}
	return nil
}

func TestRegister(t *testing.T) {
	store := newMockStore()
	service := NewAuthService(store, "secret")

	user, err := service.Register(context.Background(), "test@test.com", "password", "customer")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if user.Email != "test@test.com" {
		t.Errorf("expected email to be test@test.com, got %s", user.Email)
	}
	if user.Role != "customer" {
		t.Errorf("expected role to be customer, got %s", user.Role)
	}
}

func TestLoginAndRefreshSuccess(t *testing.T) {
	store := newMockStore()
	service := NewAuthService(store, "secret")

	// Register
	_, _ = service.Register(context.Background(), "test@test.com", "password", "customer")

	// Login
	access, refresh, err := service.Login(context.Background(), "test@test.com", "password")
	if err != nil {
		t.Fatalf("expected login success, got %v", err)
	}
	if access == "" || refresh == "" {
		t.Fatal("expected tokens to be non-empty")
	}

	// Verify token hash is stored
	h := sha256.Sum256([]byte(refresh))
	tokenHashStr := hex.EncodeToString(h[:])
	storedToken, ok := store.refreshTokens[tokenHashStr]
	if !ok {
		t.Fatal("expected refresh token to be stored in DB")
	}
	if storedToken.Revoked {
		t.Fatal("expected new refresh token to not be revoked")
	}

	// Refresh
	newAccess, newRefresh, err := service.Refresh(context.Background(), refresh)
	if err != nil {
		t.Fatalf("expected successful refresh, got %v", err)
	}
	if newAccess == "" || newRefresh == "" {
		t.Fatal("expected new tokens to be non-empty")
	}

	// The old token should now be revoked in the mock database
	storedToken = store.refreshTokens[tokenHashStr]
	if !storedToken.Revoked {
		t.Error("expected old refresh token to be marked revoked after refresh rotation")
	}
}

func TestRefreshTokenReuseDetection(t *testing.T) {
	store := newMockStore()
	service := NewAuthService(store, "secret")

	// Register and Login
	user, _ := service.Register(context.Background(), "test@test.com", "password", "customer")
	_, refresh, _ := service.Login(context.Background(), "test@test.com", "password")

	// First refresh (consumes & rotates token)
	_, newRefresh, err := service.Refresh(context.Background(), refresh)
	if err != nil {
		t.Fatalf("first refresh should succeed: %v", err)
	}

	// Old refresh token is now rotated (revoked = true)
	// Act: presenting the consumed "refresh" token again (Reuse Scenario)
	_, _, err = service.Refresh(context.Background(), refresh)
	if !errors.Is(err, ErrTokenReuse) {
		t.Fatalf("expected ErrTokenReuse, got %v", err)
	}

	// Assert: entire family revoked for user
	userIDStr := uuidToString(user.ID)
	if store.revokeAllCalled[userIDStr] == 0 {
		t.Error("expected RevokeAllUserTokens to be called on reuse detection")
	}

	// Verify all tokens for the user are now revoked
	for _, token := range store.refreshTokens {
		if uuidToString(token.UserID) == userIDStr {
			if !token.Revoked {
				t.Error("expected all refresh tokens in family to be revoked")
			}
		}
	}

	// Verify newRefresh is also revoked because it belongs to the compromised family
	h := sha256.Sum256([]byte(newRefresh))
	tokenHashStr := hex.EncodeToString(h[:])
	rotatedToken := store.refreshTokens[tokenHashStr]
	if !rotatedToken.Revoked {
		t.Error("expected rotated token to also be invalidated")
	}
}
