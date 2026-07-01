package util

import (
	"fmt"
	"strconv"
	
	"github.com/jackc/pgx/v5/pgtype"
)

// UUIDString formats a pgtype.UUID as a string
func UUIDString(u pgtype.UUID) string {
	return fmt.Sprintf("%x-%x-%x-%x-%x", u.Bytes[0:4], u.Bytes[4:6], u.Bytes[6:8], u.Bytes[8:10], u.Bytes[10:16])
}

// ParseQueryInt32 parses a string to int32, returning a default value on failure.
func ParseQueryInt32(s string, defaultValue int32) int32 {
	if s == "" {
		return defaultValue
	}
	val, err := strconv.ParseInt(s, 10, 32)
	if err != nil {
		return defaultValue
	}
	return int32(val)
}
