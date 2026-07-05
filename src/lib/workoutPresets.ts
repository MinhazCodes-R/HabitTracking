// Built-in workout presets that users can import as ready-made templates.
// Rep targets are stored as a min-max range; rest is seconds between sets.

export interface PresetExercise {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rest: number; // seconds
  notes?: string;
}

export interface PresetWorkout {
  name: string;
  description: string;
  exercises: PresetExercise[];
}

export interface WorkoutPreset {
  id: string;
  name: string;
  description: string;
  workouts: PresetWorkout[];
}

const HEAVY_REST = 150;
const MODERATE_REST = 120;
const ISOLATION_REST = 75;

export const workoutPresets: WorkoutPreset[] = [
  {
    id: 'six-day-aesthetic-split',
    name: '6-Day Aesthetic Split',
    description:
      'Bro split / PPL hybrid. Slow 3s eccentrics, last set of each exercise to failure. Arms and abs 2x/week, shoulders prioritized.',
    workouts: [
      {
        name: 'Monday — Chest + Abs',
        description: 'Heavy pressing first, then stretch-focused isolation. Abs at the end.',
        exercises: [
          { name: 'Flat Barbell Bench Press', sets: 4, repsMin: 5, repsMax: 8, rest: HEAVY_REST },
          { name: 'Incline Smith Press', sets: 3, repsMin: 8, repsMax: 10, rest: MODERATE_REST },
          { name: 'Weighted Dips', sets: 3, repsMin: 8, repsMax: 10, rest: MODERATE_REST },
          { name: 'Cable Fly (low-to-high)', sets: 3, repsMin: 12, repsMax: 15, rest: ISOLATION_REST },
          { name: 'Hanging Leg Raises', sets: 3, repsMin: 12, repsMax: 15, rest: ISOLATION_REST },
          { name: 'Cable Crunch', sets: 3, repsMin: 15, repsMax: 15, rest: ISOLATION_REST },
        ],
      },
      {
        name: 'Tuesday — Back + Biceps',
        description: 'Vertical and horizontal pulling, biceps after.',
        exercises: [
          { name: 'Weighted Pull-ups', sets: 4, repsMin: 6, repsMax: 8, rest: HEAVY_REST },
          { name: 'Smith Machine Row', sets: 4, repsMin: 8, repsMax: 10, rest: MODERATE_REST },
          { name: 'Lat Pulldown (wide grip)', sets: 3, repsMin: 10, repsMax: 12, rest: MODERATE_REST },
          { name: 'Cable Pullover', sets: 3, repsMin: 12, repsMax: 15, rest: ISOLATION_REST },
          { name: 'EZ Bar Curl', sets: 3, repsMin: 8, repsMax: 10, rest: ISOLATION_REST },
          { name: 'Incline DB Curl', sets: 3, repsMin: 10, repsMax: 12, rest: ISOLATION_REST },
        ],
      },
      {
        name: 'Wednesday — Legs (Quad Focus)',
        description: 'Squat movement day.',
        exercises: [
          { name: 'Barbell Back Squat', sets: 4, repsMin: 5, repsMax: 8, rest: HEAVY_REST },
          { name: 'Leg Press (feet low/narrow)', sets: 3, repsMin: 10, repsMax: 12, rest: MODERATE_REST },
          { name: 'Bulgarian Split Squat', sets: 3, repsMin: 8, repsMax: 10, rest: MODERATE_REST, notes: 'Per leg' },
          { name: 'Leg Extension', sets: 3, repsMin: 12, repsMax: 15, rest: ISOLATION_REST, notes: 'Slow negatives' },
          { name: 'Standing Calf Raise', sets: 4, repsMin: 10, repsMax: 12, rest: ISOLATION_REST },
        ],
      },
      {
        name: 'Thursday — Shoulders + Abs',
        description: 'Shoulder priority day for the 3D look.',
        exercises: [
          { name: 'Seated DB Overhead Press', sets: 4, repsMin: 6, repsMax: 8, rest: HEAVY_REST },
          { name: 'Cable Lateral Raise', sets: 4, repsMin: 12, repsMax: 15, rest: ISOLATION_REST, notes: 'Per side' },
          { name: 'DB Lateral Raise', sets: 3, repsMin: 15, repsMax: 20, rest: ISOLATION_REST, notes: 'Partials at the end' },
          { name: 'Reverse Pec Deck', sets: 4, repsMin: 12, repsMax: 15, rest: ISOLATION_REST },
          { name: 'Cable Rope Face Pull', sets: 3, repsMin: 15, repsMax: 15, rest: ISOLATION_REST },
          { name: 'Weighted Decline Sit-ups', sets: 3, repsMin: 12, repsMax: 12, rest: ISOLATION_REST },
          { name: 'Ab Wheel', sets: 3, repsMin: 10, repsMax: 10, rest: ISOLATION_REST },
        ],
      },
      {
        name: 'Friday — Legs (Hamstring Focus)',
        description: 'Hinge movement day.',
        exercises: [
          { name: 'Romanian Deadlift', sets: 4, repsMin: 6, repsMax: 8, rest: HEAVY_REST },
          { name: 'Seated Leg Curl', sets: 4, repsMin: 10, repsMax: 12, rest: MODERATE_REST },
          { name: 'Hip Thrust', sets: 3, repsMin: 8, repsMax: 10, rest: MODERATE_REST },
          { name: 'Lying Leg Curl', sets: 3, repsMin: 12, repsMax: 15, rest: ISOLATION_REST },
          { name: 'Seated Calf Raise', sets: 4, repsMin: 12, repsMax: 15, rest: ISOLATION_REST },
        ],
      },
      {
        name: 'Saturday — Arms',
        description: 'Biceps and triceps, second hit of the week.',
        exercises: [
          { name: 'Close-Grip Bench Press', sets: 4, repsMin: 8, repsMax: 8, rest: MODERATE_REST },
          { name: 'Bayesian Cable Curl', sets: 3, repsMin: 10, repsMax: 12, rest: ISOLATION_REST },
          { name: 'Overhead Cable Extension', sets: 3, repsMin: 10, repsMax: 12, rest: ISOLATION_REST },
          { name: 'Preacher Curl', sets: 3, repsMin: 12, repsMax: 12, rest: ISOLATION_REST },
          { name: 'Cable Pushdown', sets: 3, repsMin: 12, repsMax: 15, rest: ISOLATION_REST },
          { name: 'Hammer Curl + Reverse Pushdown', sets: 2, repsMin: 15, repsMax: 15, rest: ISOLATION_REST, notes: 'Superset' },
        ],
      },
    ],
  },
];
