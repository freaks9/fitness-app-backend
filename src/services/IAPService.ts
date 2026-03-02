import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';
import { CONFIG } from '../constants/Config';

// App Store Connect に登録した Product ID と一致させること
const subscriptionSkus = Platform.select({
    ios: [CONFIG.IAP_PRODUCT_IDS.MONTHLY, CONFIG.IAP_PRODUCT_IDS.YEARLY],
    android: [CONFIG.IAP_PRODUCT_IDS.MONTHLY, CONFIG.IAP_PRODUCT_IDS.YEARLY],
}) || [];

export const IAPService = {
    async init() {
        try {
            await IAP.initConnection();
        } catch (err) {
            console.warn('IAP init error:', err);
        }
    },

    /**
     * App Store からサブスクリプション商品情報を取得する
     * type: 'subs' を指定してサブスクリプション商品のみ取得
     */
    async getSubscriptions(): Promise<IAP.Product[]> {
        try {
            const products = await IAP.fetchProducts({ skus: subscriptionSkus, type: 'subs' });
            return (products ?? []) as IAP.Product[];
        } catch (err) {
            console.warn('Get subscriptions error:', err);
            return [];
        }
    },

    /**
     * サブスクリプション購入を開始する
     * type: 'subs' を指定し、iOS では apple.sku を渡す
     */
    async requestSubscription(sku: string) {
        return await IAP.requestPurchase({
            request: { apple: { sku } },
            type: 'subs',
        });
    },

    /**
     * 購入履歴（アクティブなサブスクリプション含む）を取得する
     * 「購入を復元」ボタンで使用
     */
    async getPurchaseHistory() {
        try {
            return await IAP.getAvailablePurchases() ?? [];
        } catch (err) {
            console.warn('Get purchase history error:', err);
            return [];
        }
    },

    async end() {
        try {
            await IAP.endConnection();
        } catch (err) {
            console.warn('IAP end error:', err);
        }
    }
};
