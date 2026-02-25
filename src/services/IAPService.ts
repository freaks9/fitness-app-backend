import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';
import { CONFIG } from '../constants/Config';

const itemSkus = Platform.select({
    ios: [
        CONFIG.IAP_PRODUCT_IDS.MONTHLY,
        CONFIG.IAP_PRODUCT_IDS.YEARLY,
    ],
    android: [
        CONFIG.IAP_PRODUCT_IDS.MONTHLY,
        CONFIG.IAP_PRODUCT_IDS.YEARLY,
    ],
}) || [];

export const IAPService = {
    async init() {
        try {
            await IAP.initConnection();
            if (Platform.OS === 'android') {
                await IAP.flushFailedPurchasesCachedAsPendingAndroid();
            }
        } catch (err) {
            console.warn('IAP init error', err);
        }
    },

    async getSubscriptions(): Promise<IAP.Subscription[]> {
        try {
            return await IAP.getSubscriptions({ skus: itemSkus });
        } catch (err) {
            console.warn('IAP getSubscriptions error', err);
            return [];
        }
    },

    async requestSubscription(sku: string) {
        try {
            await IAP.requestSubscription({ sku });
        } catch (err) {
            console.warn('IAP requestSubscription error', err);
            throw err;
        }
    },

    async getPurchaseHistory() {
        try {
            return await IAP.getPurchaseHistory();
        } catch (err) {
            console.warn('IAP getPurchaseHistory error', err);
            return [];
        }
    },

    async end() {
        await IAP.endConnection();
    }
};
