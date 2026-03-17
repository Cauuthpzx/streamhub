// Copyright 2023 LiveKit, Inc.
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
	"github.com/livekit/psrpc"
)

var (
	ErrEgressNotFound                   = psrpc.NewErrorf(psrpc.NotFound, "error.egressNotFound")
	ErrEgressNotConnected               = psrpc.NewErrorf(psrpc.Internal, "error.egressNotConnected")
	ErrIdentityEmpty                    = psrpc.NewErrorf(psrpc.InvalidArgument, "error.identityEmpty")
	ErrParticipantSidEmpty              = psrpc.NewErrorf(psrpc.InvalidArgument, "error.participantSidEmpty")
	ErrIngressNotConnected              = psrpc.NewErrorf(psrpc.Internal, "error.ingressNotConnected")
	ErrIngressNotFound                  = psrpc.NewErrorf(psrpc.NotFound, "error.ingressNotFound")
	ErrIngressNonReusable               = psrpc.NewErrorf(psrpc.InvalidArgument, "error.ingressNonReusable")
	ErrNameExceedsLimits                = psrpc.NewErrorf(psrpc.InvalidArgument, "error.nameExceedsLimits")
	ErrMetadataExceedsLimits            = psrpc.NewErrorf(psrpc.InvalidArgument, "error.metadataExceedsLimits")
	ErrAttributeExceedsLimits           = psrpc.NewErrorf(psrpc.InvalidArgument, "error.attributeExceedsLimits")
	ErrNoRoomName                       = psrpc.NewErrorf(psrpc.InvalidArgument, "error.noRoomName")
	ErrRoomNameExceedsLimits            = psrpc.NewErrorf(psrpc.InvalidArgument, "error.roomNameExceedsLimits")
	ErrParticipantIdentityExceedsLimits = psrpc.NewErrorf(psrpc.InvalidArgument, "error.participantIdentityExceedsLimits")
	ErrDestinationSameAsSourceRoom      = psrpc.NewErrorf(psrpc.InvalidArgument, "error.destinationSameAsSourceRoom")
	ErrOperationFailed                  = psrpc.NewErrorf(psrpc.Internal, "error.operationFailed")
	ErrParticipantNotFound              = psrpc.NewErrorf(psrpc.NotFound, "error.participantNotFound")
	ErrRoomNotFound                     = psrpc.NewErrorf(psrpc.NotFound, "error.roomNotFound")
	ErrRoomLockFailed                   = psrpc.NewErrorf(psrpc.Internal, "error.roomLockFailed")
	ErrRoomUnlockFailed                 = psrpc.NewErrorf(psrpc.Internal, "error.roomUnlockFailed")
	ErrRemoteUnmuteNoteEnabled          = psrpc.NewErrorf(psrpc.FailedPrecondition, "error.remoteUnmuteNotEnabled")
	ErrTrackNotFound                    = psrpc.NewErrorf(psrpc.NotFound, "error.trackNotFound")
	ErrWebHookMissingAPIKey             = psrpc.NewErrorf(psrpc.InvalidArgument, "error.webhookMissingAPIKey")
	ErrSIPNotConnected                  = psrpc.NewErrorf(psrpc.Internal, "error.sipNotConnected")
	ErrSIPTrunkNotFound                 = psrpc.NewErrorf(psrpc.NotFound, "error.sipTrunkNotFound")
	ErrSIPDispatchRuleNotFound          = psrpc.NewErrorf(psrpc.NotFound, "error.sipDispatchRuleNotFound")
	ErrSIPParticipantNotFound           = psrpc.NewErrorf(psrpc.NotFound, "error.sipParticipantNotFound")
	ErrInvalidMessageType               = psrpc.NewErrorf(psrpc.Internal, "error.invalidMessageType")
	ErrNoConnectRequest                 = psrpc.NewErrorf(psrpc.InvalidArgument, "error.noConnectRequest")
	ErrNoConnectResponse                = psrpc.NewErrorf(psrpc.InvalidArgument, "error.noConnectResponse")
	ErrDestinationIdentityRequired      = psrpc.NewErrorf(psrpc.InvalidArgument, "error.destinationIdentityRequired")

	// User auth errors — values are i18n keys, translated by frontend
	ErrUserAlreadyExists     = psrpc.NewErrorf(psrpc.AlreadyExists, "error.userAlreadyExists")
	ErrUserNotFound          = psrpc.NewErrorf(psrpc.NotFound, "error.userNotFound")
	ErrInvalidCredentials    = psrpc.NewErrorf(psrpc.Unauthenticated, "error.invalidCredentials")
	ErrUsernameEmpty         = psrpc.NewErrorf(psrpc.InvalidArgument, "error.usernameEmpty")
	ErrPasswordEmpty         = psrpc.NewErrorf(psrpc.InvalidArgument, "error.passwordEmpty")
	ErrUsernameTooShort      = psrpc.NewErrorf(psrpc.InvalidArgument, "error.usernameTooShort")
	ErrPasswordTooShort      = psrpc.NewErrorf(psrpc.InvalidArgument, "error.passwordTooShort")
	ErrUserAuthNotEnabled    = psrpc.NewErrorf(psrpc.FailedPrecondition, "error.authNotEnabled")
	ErrRoomPasswordRequired  = psrpc.NewErrorf(psrpc.Unauthenticated, "error.roomPasswordRequired")
	ErrRoomPasswordIncorrect = psrpc.NewErrorf(psrpc.Unauthenticated, "error.roomPasswordIncorrect")
	ErrRoomNameEmpty         = psrpc.NewErrorf(psrpc.InvalidArgument, "error.roomNameEmpty")
)
