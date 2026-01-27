export interface Rating {
  id: number;
  complaint_id: number;
  intervenant_id: number;
  director_id: number;
  resolution_time_hours: number;
  rating_score: number;
  created_at: string;
}

export interface RatingCreate {
  complaint_id: number;
  rating_score: number;
}
