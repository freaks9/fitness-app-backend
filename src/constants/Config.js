
export const CONFIG = {
    // 広告の表示頻度（n回に1回表示）
    AD_FREQUENCY: 3,

    // 広告と制限の設定
    FREE_PLAN_DAILY_LIMIT: 3,
    REWARDED_AD_DAILY_LIMIT: 3,
    TRIAL_DAYS: 3,
    // 広告ユニットIDの設定
    AD_UNIT_IDS: {
        INTERSTITIAL: 'ca-app-pub-2696240970582374/7149375315',
        BANNER: 'ca-app-pub-2696240970582374/2623477379',
        REWARDED: 'ca-app-pub-2696240970582374/5226037091',
    },

    // 課金アイテムの設定（App Store ConnectのProduct IDと一致させること）
    IAP_PRODUCT_IDS: {
        MONTHLY: 'com.colorlab.fitness.monthly_300',
        YEARLY: 'com.colorlab.fitness.yearly_3000',
    }
};
