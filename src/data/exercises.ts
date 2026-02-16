
export interface ExerciseItem {
    id: string;
    name: string;
    mets: number;
    category: 'Cardio' | 'Strength' | 'Sports' | 'Life';
}

export const EXERCISE_DATABASE: ExerciseItem[] = [
    // === Cardio ===
    { id: 'walk_slow', name: 'Walking (Slow, 3.2km/h)', mets: 2.8, category: 'Cardio' },
    { id: 'walk_moderate', name: 'Walking (Moderate, 4.8km/h)', mets: 3.5, category: 'Cardio' },
    { id: 'walk_brisk', name: 'Walking (Brisk, 6.4km/h)', mets: 5.0, category: 'Cardio' },
    { id: 'run_slow', name: 'Running (Slow, 8km/h)', mets: 8.3, category: 'Cardio' },
    { id: 'run_moderate', name: 'Running (Moderate, 10km/h)', mets: 9.8, category: 'Cardio' },
    { id: 'run_fast', name: 'Running (Fast, 12km/h)', mets: 11.8, category: 'Cardio' },
    { id: 'cycling_leisure', name: 'Cycling (Leisure)', mets: 4.0, category: 'Cardio' },
    { id: 'cycling_imoderate', name: 'Cycling (Moderate)', mets: 8.0, category: 'Cardio' },
    { id: 'swimming_moderate', name: 'Swimming (Moderate)', mets: 5.8, category: 'Cardio' },
    { id: 'swimming_fast', name: 'Swimming (Vigorous)', mets: 9.8, category: 'Cardio' },

    // === Strength ===
    { id: 'weight_lifting_light', name: 'Weight Lifting (Light)', mets: 3.0, category: 'Strength' },
    { id: 'weight_lifting_heavy', name: 'Weight Lifting (Vigorous)', mets: 6.0, category: 'Strength' },
    { id: 'calisthenics_moderate', name: 'Calisthenics (Pushups/Situps)', mets: 3.8, category: 'Strength' },
    { id: 'calisthenics_vigorous', name: 'Calisthenics (Vigorous)', mets: 8.0, category: 'Strength' },

    // === Sports ===
    { id: 'yoga', name: 'Yoga', mets: 2.5, category: 'Sports' },
    { id: 'pilates', name: 'Pilates', mets: 3.0, category: 'Sports' },
    { id: 'basketball', name: 'Basketball (Game)', mets: 8.0, category: 'Sports' },
    { id: 'soccer', name: 'Soccer (Competitive)', mets: 10.0, category: 'Sports' },
    { id: 'tennis_singles', name: 'Tennis (Singles)', mets: 7.3, category: 'Sports' },
    { id: 'golf_carry', name: 'Golf (Carrying clubs)', mets: 4.3, category: 'Sports' },

    // === Daily Life ===
    { id: 'cleaning', name: 'Cleaning (Light)', mets: 2.3, category: 'Life' },
    { id: 'gardening', name: 'Gardening', mets: 3.8, category: 'Life' },
    { id: 'stroller', name: 'Pushing Stroller', mets: 2.5, category: 'Life' },
];
