
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/Config';

const KEYS = {
    FIRST_LAUNCH_DATE: 'first_launch_date',
    DAILY_USAGE_COUNT: 'daily_usage_count',
    AD_WATCH_COUNT: 'ad_watch_count',
    LAST_USAGE_DATE: 'last_usage_date',
};

export const UsageLimitService = {
    /**
     * Initialize first launch date if not set
     */
    async init() {
        const firstLaunch = await AsyncStorage.getItem(KEYS.FIRST_LAUNCH_DATE);
        if (!firstLaunch) {
            await AsyncStorage.setItem(KEYS.FIRST_LAUNCH_DATE, new Date().toISOString());
        }
    },

    /**
     * Check if user is within the trial period (72 hours from first launch)
     */
    async isInTrial(): Promise<boolean> {
        const firstLaunchStr = await AsyncStorage.getItem(KEYS.FIRST_LAUNCH_DATE);
        if (!firstLaunchStr) return true; // Fail safe

        const firstLaunch = new Date(firstLaunchStr);
        const now = new Date();
        const diffMs = now.getTime() - firstLaunch.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        return diffHours < CONFIG.TRIAL_DAYS * 24;
    },

    /**
     * Get current daily usage count, resetting if it's a new day
     */
    async getDailyUsageCount(): Promise<number> {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = await AsyncStorage.getItem(KEYS.LAST_USAGE_DATE);

        if (lastDate !== today) {
            // New day, reset counts
            await AsyncStorage.setItem(KEYS.DAILY_USAGE_COUNT, '0');
            await AsyncStorage.setItem(KEYS.AD_WATCH_COUNT, '0');
            await AsyncStorage.setItem(KEYS.LAST_USAGE_DATE, today);
            return 0;
        }

        const countStr = await AsyncStorage.getItem(KEYS.DAILY_USAGE_COUNT);
        return countStr ? parseInt(countStr, 10) : 0;
    },

    /**
     * Get current daily ad watch count
     */
    async getAdWatchCount(): Promise<number> {
        const countStr = await AsyncStorage.getItem(KEYS.AD_WATCH_COUNT);
        return countStr ? parseInt(countStr, 10) : 0;
    },

    /**
     * Increment usage count
     */
    async incrementUsage() {
        const currentCount = await this.getDailyUsageCount();
        await AsyncStorage.setItem(KEYS.DAILY_USAGE_COUNT, (currentCount + 1).toString());
    },

    /**
     * Grant a reward (decrement usage count and increment ad watch count)
     */
    async grantReward() {
        const currentUsage = await this.getDailyUsageCount();
        const currentAdCount = await this.getAdWatchCount();

        // Decrement usage count so they can use it again
        if (currentUsage > 0) {
            await AsyncStorage.setItem(KEYS.DAILY_USAGE_COUNT, (currentUsage - 1).toString());
        }

        // Increment ad watch count
        await AsyncStorage.setItem(KEYS.AD_WATCH_COUNT, (currentAdCount + 1).toString());
    },

    /**
     * Check if user can watch more rewarded ads
     */
    async canWatchAd(): Promise<boolean> {
        const count = await this.getAdWatchCount();
        return count < CONFIG.REWARDED_AD_DAILY_LIMIT;
    },

    /**
     * Check if usage is allowed
     */
    async canUseAI(isPremium: boolean): Promise<boolean> {
        if (isPremium) return true;

        const inTrial = await this.isInTrial();
        if (inTrial) return true;

        const count = await this.getDailyUsageCount();
        return count < CONFIG.FREE_PLAN_DAILY_LIMIT;
    }
};
