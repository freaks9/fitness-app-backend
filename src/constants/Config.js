
export const CONFIG = {
    // 広告の表示頻度（n回に1回表示）
    AD_FREQUENCY: 3,

    // 広告と制限の設定
    FREE_PLAN_DAILY_LIMIT: 3,
    REWARDED_AD_DAILY_LIMIT: 3,
    TRIAL_DAYS: 3,
    // 開発・テスト用の広告ID（Google公式テストID）
    AD_UNIT_IDS: {
        INTERSTITIAL: 'ca-app-pub-3940256099942544/4411468910',
        BANNER: 'ca-app-pub-3940256099942544/6300978111',
        REWARDED: 'ca-app-pub-3940256099942544/5224354917',
    },

    // 課金アイテムの設定（App Store ConnectのProduct IDと一致させること）
    IAP_PRODUCT_IDS: {
        MONTHLY: 'com.colorlab.fitness.monthly_300',
        YEARLY: 'com.colorlab.fitness.yearly_3000',
    }
};
