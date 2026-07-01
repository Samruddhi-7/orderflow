package util

import (
	"fmt"
	"strconv"
)

// UUIDString formats a [16]byte UUID as a string
func UUIDString(bytes [16]byte) string {
	return fmt.Sprintf("%x-%x-%x-%x-%x", bytes[0:4], bytes[4:6], bytes[6:8], bytes[8:10], bytes[10:16])
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
