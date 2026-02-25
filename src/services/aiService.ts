import { getAdvice } from './foodApiService';

/**
 * AIによる食事アドバイスを取得する（ゴールデンルール Rule 1準拠）
 * バックエンドの /ai/advice/:userId エンドポイントを呼び出します。
 * 
 * @param userId ユーザーID
 * @param date 日付（YYYY-MM-DD形式、省略時は当日）
 * @returns アドバイスの文字列配列
 */
export const getMealAdvice = async (userId: string, date?: string): Promise<string[]> => {
    try {
        const response = await getAdvice(userId, date);
        // バックエンドからは { advice: string[] } が返ってくる
        return response.advice || ["アドバイスを取得できませんでした。"];
    } catch (error) {
        console.error("AIアドバイスの取得に失敗しました:", error);
        return ["現在アドバイスを生成できません。ネットワーク状況を確認し、再度お試しください。"];
    }
};

/**
 * 画像解析のモック（将来的な拡張用）
 */
export const analyzeImage = async (base64Image: string): Promise<{ name: string; calories: number } | null> => {
    console.log('Analyzing image...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    const mockResponses = [
        { name: '牛丼 (並)', calories: 730 },
        { name: 'シーザーサラダ', calories: 230 },
        { name: '醤油ラーメン', calories: 470 },
        { name: 'ハンバーガー', calories: 350 },
        { name: 'カツカレー', calories: 950 },
    ];
    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
};
