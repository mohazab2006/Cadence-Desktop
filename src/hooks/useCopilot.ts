/**
 * M8 Course Copilot: hooks for extracted text, chunks, summaries, scope, availability, study plan.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as copilotRepo from '../db/copilot.repo';

export function useAssetExtractedText(assetId: string | null) {
  return useQuery({
    queryKey: ['assetExtractedText', assetId],
    queryFn: () => (assetId ? copilotRepo.getExtractedTextByAssetId(assetId) : Promise.resolve(null)),
    enabled: !!assetId,
  });
}

export function useAssetChunks(assetId: string | null) {
  return useQuery({
    queryKey: ['assetChunks', assetId],
    queryFn: () => (assetId ? copilotRepo.getChunksByAssetId(assetId) : Promise.resolve([])),
    enabled: !!assetId,
  });
}

export function useAssetSummary(assetId: string | null) {
  return useQuery({
    queryKey: ['assetSummary', assetId],
    queryFn: () => (assetId ? copilotRepo.getSummaryByAssetId(assetId) : Promise.resolve(null)),
    enabled: !!assetId,
  });
}

export function useAssessmentScopeLinks(taskId: string | null) {
  return useQuery({
    queryKey: ['assessmentScope', taskId],
    queryFn: () => (taskId ? copilotRepo.getScopeLinksByTaskId(taskId) : Promise.resolve([])),
    enabled: !!taskId,
  });
}

export function useAvailabilityBlocks() {
  return useQuery({
    queryKey: ['availabilityBlocks'],
    queryFn: () => copilotRepo.getAllAvailabilityBlocks(),
  });
}

export function useCreateAvailabilityBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof copilotRepo.createAvailabilityBlock>[0]) => copilotRepo.createAvailabilityBlock(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availabilityBlocks'] }),
  });
}

export function useUpdateAvailabilityBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof copilotRepo.updateAvailabilityBlock>[1] }) =>
      copilotRepo.updateAvailabilityBlock(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availabilityBlocks'] }),
  });
}

export function useDeleteAvailabilityBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => copilotRepo.deleteAvailabilityBlock(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availabilityBlocks'] }),
  });
}

export function useStudyPlanBlocks(courseId: string | null) {
  return useQuery({
    queryKey: ['studyPlanBlocks', courseId],
    queryFn: () => (courseId ? copilotRepo.getStudyPlanBlocksByCourseId(courseId) : Promise.resolve([])),
    enabled: !!courseId,
  });
}

export function useTodaysStudyBlocks() {
  return useQuery({
    queryKey: ['studyPlanBlocks', 'today'],
    queryFn: async () => {
      const all = await copilotRepo.getAllStudyPlanBlocks();
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      return all.filter((b) => b.start >= todayStart && b.start < todayEnd);
    },
  });
}

export function useUpsertStudyPlanBlocks(courseId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (blocks: Parameters<typeof copilotRepo.upsertStudyPlanBlocks>[1]) =>
      courseId ? copilotRepo.upsertStudyPlanBlocks(courseId, blocks) : Promise.resolve(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studyPlanBlocks'] });
    },
  });
}
