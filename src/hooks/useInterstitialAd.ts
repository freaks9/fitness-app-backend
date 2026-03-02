import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    AdEventType,
    InterstitialAd,
    TestIds,
} from 'react-native-google-mobile-ads';
import { CONFIG } from '../constants/Config';

const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : CONFIG.AD_UNIT_IDS.INTERSTITIAL;
const AD_COUNT_KEY = 'interstitial_ad_count';

const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: false,
});

let isLoaded = false;

// Preload
interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
});
interstitial.addAdEventListener(AdEventType.ERROR, () => {
    isLoaded = false;
    // Retry after 30s
    setTimeout(() => interstitial.load(), 30000);
});
interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    isLoaded = false;
    interstitial.load();
});
interstitial.load();

export const useInterstitialAd = () => {
    const showAdIfReady = async (onComplete: () => void) => {
        try {
            const countStr = await AsyncStorage.getItem(AD_COUNT_KEY);
            const count = parseInt(countStr || '0', 10) + 1;
            await AsyncStorage.setItem(AD_COUNT_KEY, String(count));

            if (count % CONFIG.AD_FREQUENCY === 0 && isLoaded) {
                const closeListener = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
                    closeListener();
                    onComplete();
                });
                interstitial.show();
            } else {
                onComplete();
            }
        } catch (e) {
            console.warn('[InterstitialAd] Error:', e);
            onComplete();
        }
    };

    return { showAdIfReady, loaded: isLoaded };
};
