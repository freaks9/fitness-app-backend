import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    STREAK_COUNT: 'streak_count',
    LAST_LOGIN_DATE: 'last_login_date',
};

export const StreakService = {
    /**
     * Check and update streak info on app launch
     * Returns { currentStreak: number, isMilestone: boolean, wasBroken: boolean }
     */
    async checkStreak() {
        const today = new Date().toISOString().split('T')[0];
        const lastLogin = await AsyncStorage.getItem(KEYS.LAST_LOGIN_DATE);
        let count = parseInt(await AsyncStorage.getItem(KEYS.STREAK_COUNT) || '0', 10);

        if (!lastLogin) {
            // First time
            await AsyncStorage.setItem(KEYS.LAST_LOGIN_DATE, today);
            await AsyncStorage.setItem(KEYS.STREAK_COUNT, '1');
            return { currentStreak: 1, isMilestone: false, wasBroken: false };
        }

        if (lastLogin === today) {
            return { currentStreak: count, isMilestone: false, wasBroken: false };
        }

        const lastDate = new Date(lastLogin);
        const currentDate = new Date(today);
        const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Continued
            count += 1;
            await AsyncStorage.setItem(KEYS.LAST_LOGIN_DATE, today);
            await AsyncStorage.setItem(KEYS.STREAK_COUNT, count.toString());

            const milestones = [3, 7, 14, 21, 30, 100];
            return {
                currentStreak: count,
                isMilestone: milestones.includes(count),
                wasBroken: false
            };
        } else if (diffDays > 1) {
            // Broken
            return { currentStreak: count, isMilestone: false, wasBroken: true, lastDate: lastLogin };
        }

        return { currentStreak: count, isMilestone: false, wasBroken: false };
    },

    /**
     * Recover streak via rewarded ad
     */
    async recoverStreak() {
        const today = new Date().toISOString().split('T')[0];
        const count = parseInt(await AsyncStorage.getItem(KEYS.STREAK_COUNT) || '0', 10);
        // Add 1 for today as if they continued
        const newCount = count + 1;
        await AsyncStorage.setItem(KEYS.LAST_LOGIN_DATE, today);
        await AsyncStorage.setItem(KEYS.STREAK_COUNT, newCount.toString());
        return newCount;
    },

    /**
     * Reset streak
     */
    async resetStreak() {
        const today = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem(KEYS.LAST_LOGIN_DATE, today);
        await AsyncStorage.setItem(KEYS.STREAK_COUNT, '1');
        return 1;
    },

    async getStreakCount() {
        return parseInt(await AsyncStorage.getItem(KEYS.STREAK_COUNT) || '0', 10);
    },

    getRank(streakCount: number) {
        if (streakCount >= 30) return 'Elite Researcher';
        if (streakCount >= 7) return 'Regular Researcher';
        return 'Apprentice Researcher';
    },

    getRankId(streakCount: number) {
        if (streakCount >= 30) return 'elite';
        if (streakCount >= 7) return 'regular';
        return 'apprentice';
    }
};
