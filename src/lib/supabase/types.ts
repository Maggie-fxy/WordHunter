// Supabase 数据库类型定义

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  birthday: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  user_id: string;
  diamonds: number;
  total_collected: number;
  total_mastered: number;
  created_at: string;
  updated_at: string;
}

export interface WordRecord {
  id: string;
  user_id: string;
  word_id: string;
  choice_correct: number;
  spelling_correct: number;
  mastered: boolean;
  last_review_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectedImage {
  id: string;
  user_id: string;
  word_record_id: string;
  word_id: string;
  image_url: string;
  detected_object: string;
  captured_at: string;
}

// 数据库 Schema 类型
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      user_stats: {
        Row: UserStats;
        Insert: Partial<UserStats> & { user_id: string };
        Update: Partial<UserStats>;
      };
      word_records: {
        Row: WordRecord;
        Insert: Omit<WordRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<WordRecord>;
      };
      collected_images: {
        Row: CollectedImage;
        Insert: Omit<CollectedImage, 'id' | 'captured_at'> & { id?: string };
        Update: Partial<CollectedImage>;
      };
    };
  };
}
