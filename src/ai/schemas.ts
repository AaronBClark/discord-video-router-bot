export type VideoAnalysis = {
  title_guess: string | null;
  short_summary: string;
  detailed_summary: string;
  key_points: string[];
  topics: string[];
  recommended_channel_key: string;
  confidence: number;
  reason: string;
  content_warnings: string[];
};
