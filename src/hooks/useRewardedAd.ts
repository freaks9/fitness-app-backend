
import { useCallback, useEffect, useRef, useState } from 'react';
import { AdEventType, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { CONFIG } from '../constants/Config';

const adUnitId = __DEV__ ? TestIds.REWARDED : CONFIG.AD_UNIT_IDS.REWARDED;

export const useRewardedAd = () => {
    const [ad, setAd] = useState<RewardedAd | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [isShowing, setIsShowing] = useState(false);
    const onEarnedReward = useRef<(() => void) | null>(null);

    const loadAd = useCallback(() => {
        const rewarded = RewardedAd.createForAdRequest(adUnitId, {
            requestNonPersonalizedAdsOnly: false,
        });

        const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
            setLoaded(true);
        });

        const unsubscribeEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
            console.log('User earned reward of ', reward);
            if (onEarnedReward.current) {
                onEarnedReward.current();
                onEarnedReward.current = null;
            }
        });

        const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
            setLoaded(false);
            setIsShowing(false);
            // Load the next ad
            loadAd();
        });

        const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
            console.error('Rewarded Ad failed: ', error);
            setLoaded(false);
            setIsShowing(false);
        });

        rewarded.load();
        setAd(rewarded);

        return () => {
            unsubscribeLoaded();
            unsubscribeEarned();
            unsubscribeClosed();
            unsubscribeError();
        };
    }, []);

    useEffect(() => {
        const unsubscribe = loadAd();
        return unsubscribe;
    }, [loadAd]);

    const showRewardedAd = (callback: () => void) => {
        if (loaded && ad) {
            onEarnedReward.current = callback;
            setIsShowing(true);
            ad.show();
            return true;
        }
        return false;
    };

    return { showRewardedAd, loaded, isShowing };
};
