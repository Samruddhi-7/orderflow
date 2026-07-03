package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/Samruddhi-7/orderflow/internal/repository"
	"github.com/Samruddhi-7/orderflow/internal/repository/db"
	"github.com/Samruddhi-7/orderflow/internal/util"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

var (
	ErrUserAlreadyExists  = errors.New("user already exists")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidToken       = errors.New("invalid token")
	ErrTokenExpired       = errors.New("token has expired")
	ErrTokenRevoked       = errors.New("token has been revoked")
	ErrTokenReuse         = errors.New("refresh token reuse detected")
)

type authService struct {
	store     repository.Store
	jwtSecret string
}

func NewAuthService(store repository.Store, jwtSecret string) AuthService {
	return &authService{
		store:     store,
		jwtSecret: jwtSecret,
	}
}

// hashToken converts a raw refresh token into a SHA256 string for secure DB storage
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// generateRandomToken generates a cryptographically secure random hex string
func generateRandomToken() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// uuidToString converts a pgtype.UUID to a standard hyphenated string
func uuidToString(src pgtype.UUID) string {
	if !src.Valid {
		return ""
	}
	u, err := uuid.FromBytes(src.Bytes[:])
	if err != nil {
		return ""
	}
	return u.String()
}

func (s *authService) Register(ctx context.Context, email string, password string, role string) (db.User, error) {
	hashedPassword, err := util.HashPassword(password)
	if err != nil {
		return db.User{}, err
	}

	params := db.CreateUserParams{
		Email:        email,
		PasswordHash: hashedPassword,
		Role:         role,
	}

	user, err := s.store.CreateUser(ctx, params)
	if err != nil {
		return db.User{}, err
	}

	return user, nil
}

func (s *authService) Login(ctx context.Context, email string, password string) (string, string, error) {
	user, err := s.store.GetUserByEmail(ctx, email)
	if err != nil {
		return "", "", ErrInvalidCredentials
	}

	err = util.CheckPassword(password, user.PasswordHash)
	if err != nil {
		return "", "", ErrInvalidCredentials
	}

	userIDStr := uuidToString(user.ID)

	// Generate access token (15 mins)
	maker := util.NewTokenMaker(s.jwtSecret)
	accessToken, err := maker.CreateToken(userIDStr, user.Email, user.Role, 15*time.Minute)
	if err != nil {
		return "", "", err
	}

	// Generate refresh token (7 days)
	rawRefreshToken, err := generateRandomToken()
	if err != nil {
		return "", "", err
	}

	hashedRF := hashToken(rawRefreshToken)
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	var pgExpires pgtype.Timestamptz
	pgExpires.Time = expiresAt
	pgExpires.Valid = true

	params := db.CreateRefreshTokenParams{
		UserID:    user.ID,
		TokenHash: hashedRF,
		ExpiresAt: pgExpires,
	}

	_, err = s.store.CreateRefreshToken(ctx, params)
	if err != nil {
		return "", "", err
	}

	return accessToken, rawRefreshToken, nil
}

func (s *authService) Refresh(ctx context.Context, refreshToken string) (string, string, error) {
	hashedRF := hashToken(refreshToken)

	// Fetch token from database by hash (including revoked tokens)
	token, err := s.store.GetRefreshTokenByHash(ctx, hashedRF)
	if err != nil {
		return "", "", ErrInvalidToken
	}

	// Reuse detection: if token is already revoked, invalidate the entire family!
	if token.Revoked {
		// Invalidate all tokens for this user
		_ = s.store.RevokeAllUserTokens(ctx, token.UserID)
		return "", "", ErrTokenReuse
	}

	// Check expiration
	if token.ExpiresAt.Time.Before(time.Now()) {
		return "", "", ErrTokenExpired
	}

	// Token is valid! Now rotate:
	// 1. Revoke the current token
	err = s.store.RevokeRefreshToken(ctx, hashedRF)
	if err != nil {
		return "", "", err
	}

	// Get user info to generate new access/refresh tokens
	user, err := s.store.GetUserByID(ctx, token.UserID)
	if err != nil {
		return "", "", err
	}

	userIDStr := uuidToString(user.ID)
	maker := util.NewTokenMaker(s.jwtSecret)

	// 2. Generate new access token
	newAccessToken, err := maker.CreateToken(userIDStr, user.Email, user.Role, 15*time.Minute)
	if err != nil {
		return "", "", err
	}

	// 3. Generate new refresh token
	newRawRefreshToken, err := generateRandomToken()
	if err != nil {
		return "", "", err
	}

	newHashedRF := hashToken(newRawRefreshToken)
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	var pgExpires pgtype.Timestamptz
	pgExpires.Time = expiresAt
	pgExpires.Valid = true

	params := db.CreateRefreshTokenParams{
		UserID:    user.ID,
		TokenHash: newHashedRF,
		ExpiresAt: pgExpires,
	}

	_, err = s.store.CreateRefreshToken(ctx, params)
	if err != nil {
		return "", "", err
	}

	return newAccessToken, newRawRefreshToken, nil
}

func (s *authService) Logout(ctx context.Context, refreshToken string) error {
	hashedRF := hashToken(refreshToken)
	return s.store.RevokeRefreshToken(ctx, hashedRF)
}
