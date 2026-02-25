
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AdEventType, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';
import { CONFIG } from '../constants/Config';

const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : CONFIG.AD_UNIT_IDS.INTERSTITIAL;

export const useInterstitialAd = () => {
    const [ad, setAd] = useState<InterstitialAd | null>(null);
    const [loaded, setLoaded] = useState(false);
    const onAdDismissed = useRef<(() => void) | null>(null);

    const loadAd = useCallback(() => {
        const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
            requestNonPersonalizedAdsOnly: false,
        });

        const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
            setLoaded(true);
        });

        const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            setLoaded(false);
            if (onAdDismissed.current) {
                onAdDismissed.current();
                onAdDismissed.current = null;
            }
            // Load the next ad
            loadAd();
        });

        const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
            console.error('Ad failed to load: ', error);
            setLoaded(false);
            // If error, we still want to proceed with navigation if it was waiting
            if (onAdDismissed.current) {
                onAdDismissed.current();
                onAdDismissed.current = null;
            }
        });

        interstitial.load();
        setAd(interstitial);

        return () => {
            unsubscribeLoaded();
            unsubscribeClosed();
            unsubscribeError();
        };
    }, []);

    useEffect(() => {
        const unsubscribe = loadAd();
        return unsubscribe;
    }, [loadAd]);

    const showAdIfReady = async (callback: () => void) => {
        try {
            // Get current count
            const countStr = await AsyncStorage.getItem('ad_counter');
            let count = countStr ? parseInt(countStr, 10) : 0;

            count += 1;
            await AsyncStorage.setItem('ad_counter', count.toString());

            console.log(`Ad counter: ${count} / ${CONFIG.AD_FREQUENCY}`);

            if (count >= CONFIG.AD_FREQUENCY && ad && loaded) {
                // Reset counter
                await AsyncStorage.setItem('ad_counter', '0');

                // Set callback to run after ad is closed
                onAdDismissed.current = callback;

                // Show ad
                ad.show();
            } else {
                // Just run the callback if not time for ad or ad not loaded
                callback();
            }
        } catch (error) {
            console.error('Error in showAdIfReady:', error);
            callback();
        }
    };

    return { showAdIfReady, loaded };
};
