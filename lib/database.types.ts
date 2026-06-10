/**
 * Database types mirroring supabase/migrations/0001_init.sql.
 * Kept by hand (regenerate with `supabase gen types typescript` once a real
 * project is linked). Shape matches the Supabase typed-client contract — every
 * table/view carries a `Relationships` tuple so embedded selects type-check.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Unit of measurement for weights. */
export type Unit = "kg" | "lb";
export type Visibility = "public" | "followers" | "private";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export type GoalType =
  | "weight"
  | "calorie"
  | "protein"
  | "carbs"
  | "fat"
  | "workouts_per_week";
export type FollowStatus = "pending" | "accepted";
export type FoodSource = "usda" | "off";

/** Shape of routines.days (jsonb). */
export interface RoutineDay {
  name: string; // e.g. "Push"
  exercises: RoutineExercise[];
}
export interface RoutineExercise {
  exercise_id: string;
  target_sets: number;
  target_reps: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          why: string | null;
          unit: Unit;
          is_private: boolean;
          is_minor: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          why?: string | null;
          unit?: Unit;
          is_private?: boolean;
          is_minor?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          muscle_group: string;
          equipment: string | null;
          is_custom: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          muscle_group: string;
          equipment?: string | null;
          is_custom?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
        Relationships: [];
      };
      routines: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          days: RoutineDay[];
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          days?: RoutineDay[];
          is_public?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["routines"]["Insert"]>;
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          owner_id: string;
          routine_id: string | null;
          routine_day_index: number | null;
          started_at: string;
          ended_at: string | null;
          note: string | null;
          photo_url: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          routine_id?: string | null;
          routine_day_index?: number | null;
          started_at?: string;
          ended_at?: string | null;
          note?: string | null;
          photo_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["workouts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "workouts_routine_id_fkey";
            columns: ["routine_id"];
            isOneToOne: false;
            referencedRelation: "routines";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sets: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string;
          set_index: number;
          reps: number | null;
          weight: number | null;
          rpe: number | null;
          is_warmup: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_id: string;
          set_index: number;
          reps?: number | null;
          weight?: number | null;
          rpe?: number | null;
          is_warmup?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sets"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sets_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          follower_id: string;
          followee_id: string;
          status: FollowStatus;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          followee_id: string;
          status?: FollowStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["follows"]["Insert"]>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          owner_id: string;
          workout_id: string | null;
          caption: string | null;
          photo_url: string | null;
          visibility: Visibility;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          workout_id?: string | null;
          caption?: string | null;
          photo_url?: string | null;
          visibility?: Visibility;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "posts_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_likes: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: { post_id: string; user_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["post_likes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_comments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: "post" | "comment" | "user";
          target_id: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: "post" | "comment" | "user";
          target_id: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocker_id: string; blocked_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["blocks"]["Insert"]>;
        Relationships: [];
      };
      foods: {
        Row: {
          id: string;
          source: FoodSource;
          external_id: string;
          name: string;
          brand: string | null;
          serving: string | null;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source: FoodSource;
          external_id: string;
          name: string;
          brand?: string | null;
          serving?: string | null;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["foods"]["Insert"]>;
        Relationships: [];
      };
      food_logs: {
        Row: {
          id: string;
          owner_id: string;
          food_id: string;
          logged_at: string;
          servings: number;
          meal: Meal;
        };
        Insert: {
          id?: string;
          owner_id: string;
          food_id: string;
          logged_at?: string;
          servings?: number;
          meal: Meal;
        };
        Update: Partial<Database["public"]["Tables"]["food_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "food_logs_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      weight_logs: {
        Row: {
          id: string;
          owner_id: string;
          logged_at: string;
          weight: number;
          unit: Unit;
        };
        Insert: {
          id?: string;
          owner_id: string;
          logged_at?: string;
          weight: number;
          unit?: Unit;
        };
        Update: Partial<Database["public"]["Tables"]["weight_logs"]["Insert"]>;
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          owner_id: string;
          type: GoalType;
          target: number;
          period: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          type: GoalType;
          target: number;
          period?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["goals"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      popular_exercise_pairs: {
        Row: {
          exercise_name: string | null;
          muscle_group: string | null;
          usage_count: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_accepted_follower: {
        Args: { target: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row aliases used across modules.
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type Routine = Database["public"]["Tables"]["routines"]["Row"];
export type Workout = Database["public"]["Tables"]["workouts"]["Row"];
export type WorkoutSet = Database["public"]["Tables"]["workout_sets"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostComment = Database["public"]["Tables"]["post_comments"]["Row"];
export type Food = Database["public"]["Tables"]["foods"]["Row"];
export type FoodLog = Database["public"]["Tables"]["food_logs"]["Row"];
export type WeightLog = Database["public"]["Tables"]["weight_logs"]["Row"];
export type Goal = Database["public"]["Tables"]["goals"]["Row"];
