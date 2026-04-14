-- Migration 010: Add assignment tracking columns to submissions
-- Purpose: Allow submissions to be linked to a specific assignment (template or praatplaat)
-- so the teacher dashboard can group/filter submissions per assignment.
--
-- These columns are purely for labeling/grouping. Filtering per class
-- still uses class_id. assignment_id is NOT a foreign key on purpose:
-- if the assignment is deleted (CASCADE), the submission is deleted too,
-- so a dangling reference can never occur.

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS assignment_id UUID,
  ADD COLUMN IF NOT EXISTS assignment_type TEXT;

-- Optional: add a CHECK constraint so assignment_type is always valid
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_assignment_type_check
  CHECK (assignment_type IS NULL OR assignment_type IN ('template', 'praatplaat'));

-- Index for fast filtering by assignment
CREATE INDEX IF NOT EXISTS idx_submissions_assignment
  ON public.submissions (assignment_id)
  WHERE assignment_id IS NOT NULL;

COMMENT ON COLUMN public.submissions.assignment_id IS 'ID of the template or praatplaat this submission belongs to (labeling only)';
COMMENT ON COLUMN public.submissions.assignment_type IS 'Type of assignment: template or praatplaat';
