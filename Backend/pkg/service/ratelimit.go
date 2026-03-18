// Copyright 2024 LiveKit, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package service

import (
	"net/http"
	"sync"
	"time"

	"github.com/livekit/protocol/logger"
)

const (
	rateLimitMaxRequests = 10
	rateLimitWindow      = 60 * time.Second
)

// authRateLimiter is a module-level sliding-window IP rate limiter for auth endpoints.
var authRateLimiter = &ipRateLimiter{
	windows: make(map[string][]time.Time),
}

type ipRateLimiter struct {
	mu      sync.Mutex
	windows map[string][]time.Time
}

// allow returns true when the IP is within the rate limit window.
// It performs lazy cleanup of expired timestamps on every call for that IP.
func (rl *ipRateLimiter) allow(ip string) bool {
	now := time.Now()
	cutoff := now.Add(-rateLimitWindow)

	rl.mu.Lock()
	defer rl.mu.Unlock()

	timestamps := rl.windows[ip]

	// drop timestamps outside the sliding window
	valid := timestamps[:0]
	for _, t := range timestamps {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rateLimitMaxRequests {
		rl.windows[ip] = valid
		return false
	}

	rl.windows[ip] = append(valid, now)
	return true
}

// RateLimitMiddleware wraps h with per-IP rate limiting using authRateLimiter.
func RateLimitMiddleware(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := GetClientIP(r)
		if !authRateLimiter.allow(ip) {
			logger.Warnw("log.rateLimitExceeded", nil, "ip", ip, "path", r.URL.Path)
			writeJSON(w, http.StatusTooManyRequests, errorResponse{Error: "error.rateLimitExceeded"})
			return
		}
		h(w, r)
	}
}
