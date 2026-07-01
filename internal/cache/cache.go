package cache

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache interface defines the standard caching operations
type Cache interface {
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Get(ctx context.Context, key string, dest interface{}) error
	Delete(ctx context.Context, keys ...string) error
	DeleteByPrefix(ctx context.Context, prefix string) error
	SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error)
}

type redisCache struct {
	client *redis.Client
}

// NewRedisCache instantiates a new Redis cache service
func NewRedisCache(redisAddr string) (Cache, error) {
	client := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	// Ping to ensure connection is valid
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return &redisCache{
		client: client,
	}, nil
}

func (c *redisCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	bytes, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.client.Set(ctx, key, bytes, ttl).Err()
}

func (c *redisCache) Get(ctx context.Context, key string, dest interface{}) error {
	val, err := c.client.Get(ctx, key).Result()
	if err != nil {
		return err // redis.Nil returned when key does not exist
	}
	return json.Unmarshal([]byte(val), dest)
}

func (c *redisCache) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return c.client.Del(ctx, keys...).Err()
}

func (c *redisCache) DeleteByPrefix(ctx context.Context, prefix string) error {
	iter := c.client.Scan(ctx, 0, prefix+"*", 0).Iterator()
	var keys []string
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}
	if err := iter.Err(); err != nil {
		return err
	}
	if len(keys) > 0 {
		return c.client.Del(ctx, keys...).Err()
	}
	return nil
}

func (c *redisCache) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	bytes, err := json.Marshal(value)
	if err != nil {
		return false, err
	}
	return c.client.SetNX(ctx, key, bytes, ttl).Result()
}
