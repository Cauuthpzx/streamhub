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

package userauth_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/livekit/livekit-server/pkg/config"
	"github.com/livekit/livekit-server/pkg/service"
)

func newTestConfig() *config.Config {
	return &config.Config{
		Keys: map[string]string{"testkey": "testsecret-at-least-32-characters-long!"},
		UserAuth: config.UserAuthConfig{
			JWTSecret:         "test-jwt-secret-at-least-32chars!",
			TokenExpiry:       config.DefaultConfig.UserAuth.TokenExpiry,
			MinUsernameLength: 3,
			MinPasswordLength: 6,
		},
	}
}

func newTestService() *service.UserAuthService {
	conf := newTestConfig()
	store := service.NewLocalUserStore()
	return service.NewUserAuthService(conf, store, nil)
}

func newTestServiceWithKeys() *service.UserAuthService {
	conf := newTestConfig()
	store := service.NewLocalUserStore()
	keyProvider := newTestKeyProvider(conf)
	return service.NewUserAuthService(conf, store, keyProvider)
}

type simpleKeyProvider struct {
	keys map[string]string
}

func (p *simpleKeyProvider) GetSecret(key string) string {
	return p.keys[key]
}

func (p *simpleKeyProvider) NumKeys() int {
	return len(p.keys)
}

func newTestKeyProvider(conf *config.Config) *simpleKeyProvider {
	return &simpleKeyProvider{keys: conf.Keys}
}

func setupMux(svc *service.UserAuthService) *http.ServeMux {
	mux := http.NewServeMux()
	svc.SetupRoutes(mux)
	return mux
}

func doPost(mux http.Handler, path string, body any, headers ...string) *httptest.ResponseRecorder {
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	return w
}

func parseJSON(w *httptest.ResponseRecorder) map[string]any {
	var result map[string]any
	json.Unmarshal(w.Body.Bytes(), &result)
	return result
}

// ============================
// Register Tests
// ============================

func TestRegister_Success(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	w := doPost(mux, "/auth/register", map[string]string{
		"username": "testuser",
		"password": "password123",
	})

	require.Equal(t, http.StatusCreated, w.Code)
	resp := parseJSON(w)
	require.NotEmpty(t, resp["token"])
	require.Equal(t, "testuser", resp["username"])
}

func TestRegister_DuplicateUsername(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	// first register
	doPost(mux, "/auth/register", map[string]string{
		"username": "testuser",
		"password": "password123",
	})

	// second register same username
	w := doPost(mux, "/auth/register", map[string]string{
		"username": "testuser",
		"password": "password456",
	})

	require.Equal(t, http.StatusConflict, w.Code)
	resp := parseJSON(w)
	require.Contains(t, resp["error"], "already exists")
}

func TestRegister_EmptyUsername(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	w := doPost(mux, "/auth/register", map[string]string{
		"username": "",
		"password": "password123",
	})

	require.Equal(t, http.StatusBadRequest, w.Code)
	resp := parseJSON(w)
	require.Contains(t, resp["error"], "empty")
}

func TestRegister_EmptyPassword(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	w := doPost(mux, "/auth/register", map[string]string{
		"username": "testuser",
		"password": "",
	})

	require.Equal(t, http.StatusBadRequest, w.Code)
	resp := parseJSON(w)
	require.Contains(t, resp["error"], "empty")
}

func TestRegister_UsernameTooShort(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	w := doPost(mux, "/auth/register", map[string]string{
		"username": "ab",
		"password": "password123",
	})

	require.Equal(t, http.StatusBadRequest, w.Code)
	resp := parseJSON(w)
	require.Contains(t, resp["error"], "too short")
}

func TestRegister_PasswordTooShort(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	w := doPost(mux, "/auth/register", map[string]string{
		"username": "testuser",
		"password": "12345",
	})

	require.Equal(t, http.StatusBadRequest, w.Code)
	resp := parseJSON(w)
	require.Contains(t, resp["error"], "too short")
}

func TestRegister_MethodNotAllowed(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	req := httptest.NewRequest(http.MethodGet, "/auth/register", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	require.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

func TestRegister_InvalidBody(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewReader([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	require.Equal(t, http.StatusBadRequest, w.Code)
}

// ============================
// Login Tests
// ============================

func TestLogin_Success(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	// register first
	doPost(mux, "/auth/register", map[string]string{
		"username": "loginuser",
		"password": "password123",
	})

	// login
	w := doPost(mux, "/auth/login", map[string]string{
		"username": "loginuser",
		"password": "password123",
	})

	require.Equal(t, http.StatusOK, w.Code)
	resp := parseJSON(w)
	require.NotEmpty(t, resp["token"])
	require.Equal(t, "loginuser", resp["username"])
}

func TestLogin_WrongPassword(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	doPost(mux, "/auth/register", map[string]string{
		"username": "loginuser",
		"password": "password123",
	})

	w := doPost(mux, "/auth/login", map[string]string{
		"username": "loginuser",
		"password": "wrongpassword",
	})

	require.Equal(t, http.StatusUnauthorized, w.Code)
	resp := parseJSON(w)
	require.Contains(t, resp["error"], "invalid")
}

func TestLogin_UserNotFound(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	w := doPost(mux, "/auth/login", map[string]string{
		"username": "nonexistent",
		"password": "password123",
	})

	require.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestLogin_EmptyFields(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	// empty username
	w := doPost(mux, "/auth/login", map[string]string{
		"username": "",
		"password": "password123",
	})
	require.Equal(t, http.StatusBadRequest, w.Code)

	// empty password
	w = doPost(mux, "/auth/login", map[string]string{
		"username": "testuser",
		"password": "",
	})
	require.Equal(t, http.StatusBadRequest, w.Code)
}

func TestLogin_MethodNotAllowed(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	req := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	require.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

// ============================
// Token Tests
// ============================

func TestToken_Success(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	// register + login to get user token
	regW := doPost(mux, "/auth/register", map[string]string{
		"username": "tokenuser",
		"password": "password123",
	})
	regResp := parseJSON(regW)
	userToken := regResp["token"].(string)

	// request LiveKit token
	w := doPost(mux, "/auth/token",
		map[string]string{"room": "my-room"},
		"Authorization", "Bearer "+userToken,
	)

	require.Equal(t, http.StatusOK, w.Code)
	resp := parseJSON(w)
	require.NotEmpty(t, resp["access_token"])
	require.Equal(t, "tokenuser", resp["username"])
}

func TestToken_WithoutAuth(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	w := doPost(mux, "/auth/token", map[string]string{"room": "my-room"})

	require.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestToken_InvalidToken(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	w := doPost(mux, "/auth/token",
		map[string]string{"room": "my-room"},
		"Authorization", "Bearer invalid.jwt.token",
	)

	require.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestToken_EmptyRoom(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	// register to get token
	regW := doPost(mux, "/auth/register", map[string]string{
		"username": "tokenuser2",
		"password": "password123",
	})
	regResp := parseJSON(regW)
	userToken := regResp["token"].(string)

	// request token without room (should still work - grants room create)
	w := doPost(mux, "/auth/token",
		map[string]string{},
		"Authorization", "Bearer "+userToken,
	)

	require.Equal(t, http.StatusOK, w.Code)
	resp := parseJSON(w)
	require.NotEmpty(t, resp["access_token"])
}

func TestToken_MethodNotAllowed(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	req := httptest.NewRequest(http.MethodGet, "/auth/token", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	require.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

// ============================
// Auth Not Enabled Tests
// ============================

func TestRegister_AuthNotEnabled(t *testing.T) {
	conf := &config.Config{
		Keys:     map[string]string{"k": "s"},
		UserAuth: config.UserAuthConfig{JWTSecret: ""}, // not enabled
	}
	svc := service.NewUserAuthService(conf, service.NewLocalUserStore(), nil)
	mux := setupMux(svc)

	w := doPost(mux, "/auth/register", map[string]string{
		"username": "testuser",
		"password": "password123",
	})

	require.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestLogin_AuthNotEnabled(t *testing.T) {
	conf := &config.Config{
		Keys:     map[string]string{"k": "s"},
		UserAuth: config.UserAuthConfig{JWTSecret: ""},
	}
	svc := service.NewUserAuthService(conf, service.NewLocalUserStore(), nil)
	mux := setupMux(svc)

	w := doPost(mux, "/auth/login", map[string]string{
		"username": "testuser",
		"password": "password123",
	})

	require.Equal(t, http.StatusServiceUnavailable, w.Code)
}
