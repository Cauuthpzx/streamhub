package localstoretest

import (
	"context"
	"testing"

	"github.com/livekit/protocol/livekit"
	"github.com/stretchr/testify/require"

	"github.com/livekit/livekit-server/pkg/service"
)

func TestLocalStoreEgress(t *testing.T) {
	ctx := context.Background()
	s := service.NewLocalStore()

	t.Run("StoreEgress and LoadEgress", func(t *testing.T) {
		info := &livekit.EgressInfo{
			EgressId: "EG_test1",
			RoomName: "room1",
			Status:   livekit.EgressStatus_EGRESS_ACTIVE,
		}

		require.NoError(t, s.StoreEgress(ctx, info))

		loaded, err := s.LoadEgress(ctx, "EG_test1")
		require.NoError(t, err)
		require.Equal(t, "EG_test1", loaded.EgressId)
		require.Equal(t, "room1", loaded.RoomName)
		require.Equal(t, livekit.EgressStatus_EGRESS_ACTIVE, loaded.Status)
	})

	t.Run("LoadEgress returns error for missing ID", func(t *testing.T) {
		_, err := s.LoadEgress(ctx, "EG_nonexistent")
		require.ErrorIs(t, err, service.ErrEgressNotFound)
	})

	t.Run("StoreEgress clones proto", func(t *testing.T) {
		info := &livekit.EgressInfo{
			EgressId: "EG_clone",
			RoomName: "room1",
			Status:   livekit.EgressStatus_EGRESS_STARTING,
		}
		require.NoError(t, s.StoreEgress(ctx, info))

		info.RoomName = "mutated"

		loaded, err := s.LoadEgress(ctx, "EG_clone")
		require.NoError(t, err)
		require.Equal(t, "room1", loaded.RoomName)
	})

	t.Run("LoadEgress returns clone", func(t *testing.T) {
		require.NoError(t, s.StoreEgress(ctx, &livekit.EgressInfo{
			EgressId: "EG_loadclone",
			RoomName: "room1",
		}))

		loaded, _ := s.LoadEgress(ctx, "EG_loadclone")
		loaded.RoomName = "mutated"

		loaded2, _ := s.LoadEgress(ctx, "EG_loadclone")
		require.Equal(t, "room1", loaded2.RoomName)
	})
}

func TestLocalStoreListEgress(t *testing.T) {
	ctx := context.Background()
	s := service.NewLocalStore()

	egresses := []*livekit.EgressInfo{
		{EgressId: "EG_1", RoomName: "room1", Status: livekit.EgressStatus_EGRESS_ACTIVE},
		{EgressId: "EG_2", RoomName: "room1", Status: livekit.EgressStatus_EGRESS_COMPLETE},
		{EgressId: "EG_3", RoomName: "room2", Status: livekit.EgressStatus_EGRESS_ACTIVE},
		{EgressId: "EG_4", RoomName: "room2", Status: livekit.EgressStatus_EGRESS_STARTING},
	}
	for _, eg := range egresses {
		require.NoError(t, s.StoreEgress(ctx, eg))
	}

	t.Run("list all egresses", func(t *testing.T) {
		items, err := s.ListEgress(ctx, "", false)
		require.NoError(t, err)
		require.Len(t, items, 4)
	})

	t.Run("filter by room name", func(t *testing.T) {
		items, err := s.ListEgress(ctx, "room1", false)
		require.NoError(t, err)
		require.Len(t, items, 2)
		for _, item := range items {
			require.Equal(t, "room1", item.RoomName)
		}
	})

	t.Run("filter active only", func(t *testing.T) {
		items, err := s.ListEgress(ctx, "", true)
		require.NoError(t, err)
		require.Len(t, items, 3)
		for _, item := range items {
			require.True(t,
				item.Status == livekit.EgressStatus_EGRESS_ACTIVE ||
					item.Status == livekit.EgressStatus_EGRESS_STARTING,
			)
		}
	})

	t.Run("filter by room and active", func(t *testing.T) {
		items, err := s.ListEgress(ctx, "room2", true)
		require.NoError(t, err)
		require.Len(t, items, 2)
	})

	t.Run("empty result for nonexistent room", func(t *testing.T) {
		items, err := s.ListEgress(ctx, "room99", false)
		require.NoError(t, err)
		require.Len(t, items, 0)
	})
}

func TestLocalStoreUpdateEgress(t *testing.T) {
	ctx := context.Background()
	s := service.NewLocalStore()

	t.Run("update existing egress", func(t *testing.T) {
		info := &livekit.EgressInfo{
			EgressId: "EG_upd",
			RoomName: "room1",
			Status:   livekit.EgressStatus_EGRESS_ACTIVE,
		}
		require.NoError(t, s.StoreEgress(ctx, info))

		updated := &livekit.EgressInfo{
			EgressId: "EG_upd",
			RoomName: "room1",
			Status:   livekit.EgressStatus_EGRESS_COMPLETE,
		}
		require.NoError(t, s.UpdateEgress(ctx, updated))

		loaded, err := s.LoadEgress(ctx, "EG_upd")
		require.NoError(t, err)
		require.Equal(t, livekit.EgressStatus_EGRESS_COMPLETE, loaded.Status)
	})

	t.Run("update nonexistent egress returns error", func(t *testing.T) {
		err := s.UpdateEgress(ctx, &livekit.EgressInfo{
			EgressId: "EG_missing",
		})
		require.ErrorIs(t, err, service.ErrEgressNotFound)
	})

	t.Run("update clones proto", func(t *testing.T) {
		require.NoError(t, s.StoreEgress(ctx, &livekit.EgressInfo{
			EgressId: "EG_updclone",
			RoomName: "room1",
			Status:   livekit.EgressStatus_EGRESS_ACTIVE,
		}))

		updInfo := &livekit.EgressInfo{
			EgressId: "EG_updclone",
			RoomName: "room1",
			Status:   livekit.EgressStatus_EGRESS_COMPLETE,
		}
		require.NoError(t, s.UpdateEgress(ctx, updInfo))

		updInfo.Status = livekit.EgressStatus_EGRESS_FAILED

		loaded, _ := s.LoadEgress(ctx, "EG_updclone")
		require.Equal(t, livekit.EgressStatus_EGRESS_COMPLETE, loaded.Status)
	})
}
