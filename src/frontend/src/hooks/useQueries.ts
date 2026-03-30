import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Event, EventType, type Hatch, HatchState } from "../backend";
import { getBackend } from "../utils/backendClient";

export function useAllHatches() {
  return useQuery<Hatch[]>({
    queryKey: ["hatches"],
    queryFn: async () => (await getBackend()).getAllHatches(),
  });
}

export function useNotificationBuckets() {
  return useQuery({
    queryKey: ["buckets"],
    queryFn: async () => (await getBackend()).getNotificationBuckets(),
  });
}

export function useHatch(id: bigint | null) {
  return useQuery<Hatch>({
    queryKey: ["hatch", id?.toString()],
    queryFn: async () => (await getBackend()).getHatch(id!),
    enabled: id !== null,
  });
}

export function useHatchEvents(hatchId: bigint | null) {
  return useQuery<Event[]>({
    queryKey: ["events", hatchId?.toString()],
    queryFn: async () => (await getBackend()).getEventsForHatch(hatchId!),
    enabled: hatchId !== null,
  });
}

export function useAddHatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => (await getBackend()).addHatch(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hatches"] }),
  });
}

export function useDeleteHatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => (await getBackend()).deleteHatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hatches"] });
      qc.invalidateQueries({ queryKey: ["buckets"] });
    },
  });
}

export function useAddEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      hatchId,
      eventType,
      date,
      note,
    }: { hatchId: bigint; eventType: EventType; date: bigint; note: string }) =>
      (await getBackend()).addEvent(hatchId, eventType, date, note),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["hatch", vars.hatchId.toString()] });
      qc.invalidateQueries({ queryKey: ["events", vars.hatchId.toString()] });
      qc.invalidateQueries({ queryKey: ["hatches"] });
      qc.invalidateQueries({ queryKey: ["buckets"] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId }: { eventId: bigint; hatchId: bigint }) =>
      (await getBackend()).deleteEvent(eventId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["events", vars.hatchId.toString()] });
      qc.invalidateQueries({ queryKey: ["hatch", vars.hatchId.toString()] });
    },
  });
}

export function useUpdateHatchState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      hatchId,
      state,
    }: { hatchId: bigint; state: HatchState }) =>
      (await getBackend()).updateHatchState(hatchId, state),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["hatch", vars.hatchId.toString()] });
      qc.invalidateQueries({ queryKey: ["hatches"] });
      qc.invalidateQueries({ queryKey: ["buckets"] });
    },
  });
}

export { EventType, HatchState };
