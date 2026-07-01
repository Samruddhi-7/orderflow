package util

import (
	"strconv"
)

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
