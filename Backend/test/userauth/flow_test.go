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
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/livekit/protocol/auth"

	"github.com/livekit/livekit-server/pkg/service"
)

// TestFullAuthFlow tests the complete user flow:
// Register -> Login -> Get LiveKit Token -> Verify token grants
func TestFullAuthFlow(t *testing.T) {
	conf := newTestConfig()
	store := service.NewLocalUserStore()
	keyProvider := newTestKeyProvider(conf)
	svc := service.NewUserAuthService(conf, store, keyProvider)
	mux := setupMux(svc)

	// Step 1: Register
	regW := doPost(mux, "/auth/register", map[string]string{
		"username": "flowuser",
		"password": "securepass123",
	})
	require.Equal(t, http.StatusCreated, regW.Code)
	regResp := parseJSON(regW)
	require.NotEmpty(t, regResp["token"])
	require.Equal(t, "flowuser", regResp["username"])

	// Step 2: Login with same credentials
	loginW := doPost(mux, "/auth/login", map[string]string{
		"username": "flowuser",
		"password": "securepass123",
	})
	require.Equal(t, http.StatusOK, loginW.Code)
	loginResp := parseJSON(loginW)
	userToken := loginResp["token"].(string)
	require.NotEmpty(t, userToken)

	// Step 3: Get LiveKit access token
	tokenW := doPost(mux, "/auth/token",
		map[string]string{"room": "test-room"},
		"Authorization", "Bearer "+userToken,
	)
	require.Equal(t, http.StatusOK, tokenW.Code)
	tokenResp := parseJSON(tokenW)
	accessToken := tokenResp["access_token"].(string)
	require.NotEmpty(t, accessToken)
	require.Equal(t, "flowuser", tokenResp["username"])

	// Step 4: Verify LiveKit token has correct grants
	verifier, err := auth.ParseAPIToken(accessToken)
	require.NoError(t, err)

	secret := conf.Keys["testkey"]
	_, grants, err := verifier.Verify(secret)
	require.NoError(t, err)

	require.Equal(t, "flowuser", grants.Identity)
	require.NotNil(t, grants.Video)
	require.True(t, grants.Video.RoomCreate)
	require.True(t, grants.Video.RoomJoin)
	require.True(t, grants.Video.RoomList)
	require.True(t, grants.Video.GetCanPublish())
	require.True(t, grants.Video.GetCanPublishData())
	require.True(t, grants.Video.GetCanSubscribe())
	require.Equal(t, "test-room", grants.Video.Room)
}

// TestFullFlow_RegisterLoginDifferentTokens ensures register and login return
// valid but potentially different tokens (different iat)
func TestFullFlow_RegisterLoginDifferentTokens(t *testing.T) {
	svc := newTestService()
	mux := setupMux(svc)

	regW := doPost(mux, "/auth/register", map[string]string{
		"username": "diffuser",
		"password": "password123",
	})
	regResp := parseJSON(regW)

	loginW := doPost(mux, "/auth/login", map[string]string{
		"username": "diffuser",
		"password": "password123",
	})
	loginResp := parseJSON(loginW)

	require.NotEmpty(t, regResp["token"])
	require.NotEmpty(t, loginResp["token"])
	require.Equal(t, regResp["username"], loginResp["username"])
}

// TestFullFlow_MultipleUsers ensures multiple users can coexist
func TestFullFlow_MultipleUsers(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	users := []struct {
		username string
		password string
	}{
		{"alice", "alice_pass123"},
		{"bob", "bob_pass123"},
		{"charlie", "charlie_pass123"},
	}

	// register all
	for _, u := range users {
		w := doPost(mux, "/auth/register", map[string]string{
			"username": u.username,
			"password": u.password,
		})
		require.Equal(t, http.StatusCreated, w.Code)
	}

	// login all and get LiveKit tokens
	for _, u := range users {
		loginW := doPost(mux, "/auth/login", map[string]string{
			"username": u.username,
			"password": u.password,
		})
		require.Equal(t, http.StatusOK, loginW.Code)
		loginResp := parseJSON(loginW)
		userToken := loginResp["token"].(string)

		tokenW := doPost(mux, "/auth/token",
			map[string]string{"room": "shared-room"},
			"Authorization", "Bearer "+userToken,
		)
		require.Equal(t, http.StatusOK, tokenW.Code)
		tokenResp := parseJSON(tokenW)
		require.NotEmpty(t, tokenResp["access_token"])
		require.Equal(t, u.username, tokenResp["username"])

		// verify identity in LiveKit token
		verifier, err := auth.ParseAPIToken(tokenResp["access_token"].(string))
		require.NoError(t, err)
		_, grants, err := verifier.Verify("testsecret-at-least-32-characters-long!")
		require.NoError(t, err)
		require.Equal(t, u.username, grants.Identity)
	}

	// cross-login should fail
	w := doPost(mux, "/auth/login", map[string]string{
		"username": "alice",
		"password": "bob_pass123",
	})
	require.Equal(t, http.StatusUnauthorized, w.Code)
}

// TestFullFlow_TokenIsolation ensures user A's token identity matches user A
func TestFullFlow_TokenIsolation(t *testing.T) {
	svc := newTestServiceWithKeys()
	mux := setupMux(svc)

	// register alice and bob
	doPost(mux, "/auth/register", map[string]string{"username": "alice2", "password": "alice_pass123"})
	doPost(mux, "/auth/register", map[string]string{"username": "bob2", "password": "bob_pass123"})

	// login as alice
	loginW := doPost(mux, "/auth/login", map[string]string{
		"username": "alice2",
		"password": "alice_pass123",
	})
	aliceToken := parseJSON(loginW)["token"].(string)

	// get LiveKit token with alice's user token
	tokenW := doPost(mux, "/auth/token",
		map[string]string{"room": "private-room"},
		"Authorization", "Bearer "+aliceToken,
	)
	require.Equal(t, http.StatusOK, tokenW.Code)
	tokenResp := parseJSON(tokenW)

	// decode JWT payload to verify identity
	parts := strings.Split(tokenResp["access_token"].(string), ".")
	require.Len(t, parts, 3)
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	require.NoError(t, err)

	var claims struct {
		Identity string `json:"identity"`
	}
	err = json.Unmarshal(payload, &claims)
	require.NoError(t, err)
	require.Equal(t, "alice2", claims.Identity)
}
