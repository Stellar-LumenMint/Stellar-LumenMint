'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useStellarWallet } from '@/components/wallet/hooks/useStellarWallet';
import { WalletModal } from '@/components/wallet/WalletModal';
import { useToast } from '@/lib/stores';
import {
  FOLLOW_CREATOR_MUTATION,
  UNFOLLOW_CREATOR_MUTATION,
} from '@/lib/graphql/queries/creator.queries';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CreatorFollowButtonProps = {
  creatorId: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
  className?: string;
};

export function CreatorFollowButton({
  creatorId,
  initialFollowing,
  initialFollowerCount,
  className,
}: CreatorFollowButtonProps) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const authUser = useAuthStore((state) => state.user);
  const { connected } = useStellarWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);

  // Snapshot of the state just before the in-flight mutation, so a failed
  // request restores exactly what the user saw — not the mount-time values.
  const preMutationState = useRef({ isFollowing, followerCount });

  const restorePreMutationState = () => {
    setIsFollowing(preMutationState.current.isFollowing);
    setFollowerCount(preMutationState.current.followerCount);
  };

  const [followCreator, followState] = useMutation(FOLLOW_CREATOR_MUTATION, {
    optimisticResponse: {
      followCreator: {
        __typename: 'FollowResult',
        success: true,
        followerCount: followerCount + 1,
        isFollowing: true,
      },
    },
    onCompleted: (data) => {
      setIsFollowing(data.followCreator.isFollowing);
      setFollowerCount(data.followCreator.followerCount);
    },
    onError: () => {
      restorePreMutationState();
      showError(t('creator.followError'));
    },
  });

  const [unfollowCreator, unfollowState] = useMutation(UNFOLLOW_CREATOR_MUTATION, {
    optimisticResponse: {
      unfollowCreator: {
        __typename: 'FollowResult',
        success: true,
        followerCount: Math.max(0, followerCount - 1),
        isFollowing: false,
      },
    },
    onCompleted: (data) => {
      setIsFollowing(data.unfollowCreator.isFollowing);
      setFollowerCount(data.unfollowCreator.followerCount);
    },
    onError: () => {
      restorePreMutationState();
      showError(t('creator.unfollowError'));
    },
  });

  const loading = followState.loading || unfollowState.loading;
  const isAuthenticated = Boolean(authUser?.id);

  const handleClick = async () => {
    if (!isAuthenticated || !connected) {
      setWalletModalOpen(true);
      return;
    }

    // The optimistic response in the mutation options applies the UI update;
    // snapshot first so the rollback path can restore it precisely.
    preMutationState.current = { isFollowing, followerCount };

    if (isFollowing) {
      await unfollowCreator({ variables: { creatorId } });
      return;
    }

    await followCreator({ variables: { creatorId } });
  };

  return (
    <>
      <Button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'min-w-[108px] bg-gradient-to-r from-[#4e3bff] to-[#9747ff] text-white hover:opacity-90',
          isFollowing && 'border border-gray-600 bg-transparent from-transparent to-transparent',
          className,
        )}
        variant={isFollowing ? 'outline' : 'default'}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          t('common.unfollow')
        ) : (
          t('common.follow')
        )}
      </Button>

      <WalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </>
  );
}
