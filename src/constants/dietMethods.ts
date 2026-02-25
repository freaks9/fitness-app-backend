export const DIET_METHODS = [
    { id: 'low_carb', label: '糖質制限', color: '#FF9500' }, // Orange
    { id: 'low_fat', label: '脂質制限', color: '#FF2D55' },  // Red/Pink
    { id: 'calorie_control', label: 'カロリー管理', color: '#34C759' }, // Green
    { id: 'keto', label: 'ケトジェニック', color: '#5856D6' }, // Purple
    { id: 'fasting', label: 'ファスティング', color: '#5AC8FA' }, // Light Blue
    { id: 'supplements', label: 'サプリメント', color: '#AF52DE' }, // Violet
    { id: 'muscle_training', label: '筋トレ併用', color: '#FF3B30' }, // Red
    { id: 'other', label: 'その他', color: '#8E8E93' }, // Gray
];

export const getDietMethodLabel = (id: string) => {
    const method = DIET_METHODS.find(m => m.id === id);
    return method ? method.label : id;
};

export const getDietMethodColor = (id: string) => {
    const method = DIET_METHODS.find(m => m.id === id);
    return method ? method.color : '#8E8E93';
};
