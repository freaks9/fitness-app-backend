
export interface SavedMenu {
    id: string;
    user_id: string;
    report_id: string;
    created_at: string;
    lab_reports?: {
        id: string;
        dish_name: string;
        nutrients: any;
        comment: string;
        image_url?: string;
        method_tag?: string;
        is_recommended?: boolean;
    };
}
