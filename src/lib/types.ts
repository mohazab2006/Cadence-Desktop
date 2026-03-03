// Enums
export const TaskType = {
  ASSIGNMENT: 'Assignment',
  TUTORIAL: 'Tutorial',
  QUIZ: 'Quiz',
  MIDTERM: 'Midterm',
  EXAM: 'Exam',
  FINAL: 'Final',
  LAB: 'Lab',
  READING: 'Reading',
  PROJECT: 'Project',
  OTHER: 'Other',
} as const;

export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const TaskStatus = {
  TODO: 'todo',
  DOING: 'doing',
  DONE: 'done',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskSource = {
  MANUAL: 'manual',
  IMPORTED_OUTLINE: 'imported-outline',
  AI_GENERATED: 'ai-generated',
} as const;

export type TaskSource = (typeof TaskSource)[keyof typeof TaskSource];

export const Priority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

// Entities
export interface Course {
  id: string;
  code: string;
  name: string;
  term: string;
  target_grade_default: number;
  color: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  byWeekday?: string[]; // ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  timeOfDay?: string; // 'HH:MM' format
  endType: 'NEVER' | 'UNTIL' | 'COUNT';
  untilDate?: string; // ISO date string
  count?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  type: TaskType;
  course_id: string | null;
  life_category_id?: string | null;
  workspace?: 'school' | 'life';
  status: TaskStatus;
  priority_manual: Priority | null;
  effort_estimate_minutes: number | null;
  tags: string | null;
  source: TaskSource;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Recurring task fields
  isRecurringTemplate?: boolean;
  recurrenceRuleJson?: string | null;
  recurringSeriesId?: string | null;
  parentTemplateId?: string | null;
  occurrenceDate?: string | null;
  isOccurrenceOverride?: boolean;
}

export interface TaskGrade {
  task_id: string;
  grade_percent: number | null;   // can exceed 100 (bonus)
  weight_percent: number | null;  // % of final grade
  is_graded: boolean;
  counts: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  text: string;
  done: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Display types (with joins)
export interface TaskWithCourse extends Task {
  course?: Course;
  lifeCategory?: LifeCategory;
  subtasks?: Subtask[];
  grade?: TaskGrade;
}

export interface LifeCategory {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TaskTypeOption {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Form input types
export interface CreateCourseInput {
  code: string;
  name: string;
  term: string;
  target_grade_default?: number;
  color?: string;
}

export interface UpdateCourseInput {
  id: string;
  code?: string;
  name?: string;
  term?: string;
  target_grade_default?: number;
  color?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  due_at?: string;
  type?: TaskType;
  course_id?: string;
  life_category_id?: string;
  workspace?: 'school' | 'life';
  status?: TaskStatus;
  priority_manual?: Priority;
  effort_estimate_minutes?: number;
  tags?: string;
  source?: TaskSource;
  // Recurring task fields
  isRecurringTemplate?: boolean;
  recurrenceRuleJson?: string | null;
  recurringSeriesId?: string | null;
  parentTemplateId?: string | null;
  occurrenceDate?: string | null;
  isOccurrenceOverride?: boolean;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  due_at?: string;
  type?: TaskType;
  course_id?: string;
  life_category_id?: string;
  status?: TaskStatus;
  priority_manual?: Priority;
  effort_estimate_minutes?: number;
  tags?: string;
  // Recurring task fields
  isRecurringTemplate?: boolean;
  recurrenceRuleJson?: string | null;
  recurringSeriesId?: string | null;
  parentTemplateId?: string | null;
  occurrenceDate?: string | null;
  isOccurrenceOverride?: boolean;
}

export interface CreateSubtaskInput {
  task_id: string;
  text: string;
  order_index?: number;
}

export interface UpdateSubtaskInput {
  id: string;
  text?: string;
  done?: boolean;
  order_index?: number;
}

// Course import (Milestone 5) + M8 asset types
export const AssetType = {
  OUTLINE: 'outline',
  CALENDAR: 'calendar',
  LECTURE: 'lecture',
  TUTORIAL: 'tutorial',
  OTHER: 'other',
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

export interface CourseAsset {
  id: string;
  course_id: string | null;
  file_name: string;
  file_path: string;
  content_type: string | null;
  file_size: number | null;
  created_at: string;
  deleted_at: string | null;
  /** M8: outline | calendar | lecture | tutorial | other */
  asset_type?: AssetType | string | null;
  /** M8: optional source label */
  source?: string | null;
}

/** One proposed task from outline parsing; used in Review & Edit before creating real tasks. */
export interface ParsedOutlineRow {
  id: string;
  title: string;
  type: string; // TaskType name, e.g. 'Assignment', 'Quiz'
  weight_percent: number | null;
  due_at: string | null; // ISO or null if vague
  notes: string; // vague timing, TBA, "see Brightspace", etc.
  suggestion_note: string; // e.g. "Best 10 of 11"
  include: boolean;
}

// --- Milestone 6: Course rules (drop lowest, etc.) ---
export const CourseRuleType = {
  DROP_LOWEST: 'DROP_LOWEST',
} as const;
export type CourseRuleType = (typeof CourseRuleType)[keyof typeof CourseRuleType];

export interface CourseRule {
  id: string;
  course_id: string;
  type: CourseRuleType;
  target: string; // TaskType name, e.g. 'Quiz', 'Lab'
  keep: number;
  total: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// --- Milestone 6: Course profile (extracted from assets) ---
export interface CourseProfile {
  course_id: string;
  professor_name: string | null;
  professor_email: string | null;
  ta_names_emails: string | null;
  office_hours: string | null;
  learning_objectives: string | null;
  textbook_requirements: string | null;
  technical_requirements: string | null;
  attendance_rules: string | null;
  exam_pass_requirement: string | null;
  submission_policies: string | null;
  raw_extract: string | null;
  updated_at: string;
}

// --- Milestone 6: Priority / focus ---
export type FocusTag =
  | 'High Impact'
  | 'High Effort'
  | 'Quick Win'
  | 'At Risk'
  | 'Low Flexibility';

export interface TaskWithFocus extends TaskWithCourse {
  focusScore?: number;
  focusTags?: FocusTag[];
  focusReason?: string;
}

// --- Milestone 8: Course Copilot ---
export interface AssetExtractedText {
  asset_id: string;
  full_text: string;
  page_info_json: string | null; // e.g. [{ "page": 1, "textLength": 500 }]
  indexed_at: string;
}

export interface AssetChunk {
  id: string;
  asset_id: string;
  chunk_index: number;
  snippet: string;
  page_start: number | null;
  page_end: number | null;
  created_at: string;
}

export interface AssetSummary {
  asset_id: string;
  summary_bullets: string; // JSON array of strings
  key_concepts: string; // JSON array of strings
  formulas_code: string | null; // JSON array or null
  updated_at: string;
}

export interface AssessmentScopeLink {
  id: string;
  task_id: string;
  asset_id: string;
  chunk_id: string | null;
  confidence: number; // 0–1
  explanation: string;
  created_at: string;
}

export interface AvailabilityBlock {
  id: string;
  title: string;
  start_time: string; // "HH:mm"
  end_time: string;
  day_of_week: number | null; // 0–6, null = daily
  recurrence: 'none' | 'daily' | 'weekly';
  start_date: string | null; // ISO date for fixed blocks
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudyPlanBlock {
  id: string;
  course_id: string;
  task_id: string | null; // optional link to assessment task
  title: string;
  start: string; // ISO datetime
  end: string;
  linked_asset_ids: string; // JSON array
  block_type: 'review' | 'practice' | 'other';
  created_at: string;
  updated_at: string;
}

