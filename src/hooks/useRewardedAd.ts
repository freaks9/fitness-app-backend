import { useEffect, useRef, useState } from 'react';
import {
    AdEventType,
    RewardedAd,
    RewardedAdEventType,
    TestIds,
} from 'react-native-google-mobile-ads';
import { CONFIG } from '../constants/Config';

const adUnitId = __DEV__ ? TestIds.REWARDED : CONFIG.AD_UNIT_IDS.REWARDED;

export const useRewardedAd = () => {
    const [loaded, setLoaded] = useState(false);
    const [isShowing, setIsShowing] = useState(false);
    const rewardedRef = useRef<RewardedAd | null>(null);
    const earnedCallbackRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const rewarded = RewardedAd.createForAdRequest(adUnitId, {
            requestNonPersonalizedAdsOnly: false,
        });
        rewardedRef.current = rewarded;

        const loadedSub = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
            setLoaded(true);
        });
        const earnedSub = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
            earnedCallbackRef.current?.();
        });
        const closedSub = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
            setIsShowing(false);
            setLoaded(false);
            rewarded.load();
        });
        const errorSub = rewarded.addAdEventListener(AdEventType.ERROR, () => {
            setLoaded(false);
            setTimeout(() => rewarded.load(), 30000);
        });

        rewarded.load();

        return () => {
            loadedSub();
            earnedSub();
            closedSub();
            errorSub();
        };
    }, []);

    const showRewardedAd = (onEarned: () => void) => {
        if (!loaded || !rewardedRef.current) {
            console.warn('[RewardedAd] Ad not loaded yet');
            return false;
        }
        earnedCallbackRef.current = onEarned;
        setIsShowing(true);
        rewardedRef.current.show();
        return true;
    };

    return { showRewardedAd, loaded, isShowing };
};
