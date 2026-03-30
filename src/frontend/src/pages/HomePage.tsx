import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { Hatch } from "../backend";
import {
  EventType,
  HatchState,
  useAddEvent,
  useAddHatch,
  useAllHatches,
  useDeleteHatch,
  useNotificationBuckets,
  useUpdateHatchState,
} from "../hooks/useQueries";
import { getBackend } from "../utils/backendClient";
import {
  CARD_TINT_CLASSES,
  STATE_BADGE_CLASSES,
  STATE_LABELS,
  daysSince,
  findLastEvent,
  formatDate,
} from "../utils/stateHelpers";

interface Props {
  onSelectHatch: (id: bigint) => void;
}

const BUCKET_CONFIG = [
  {
    key: "readyForCrossing" as const,
    title: "Ready for Crossing",
    desc: "Hatches awaiting mating",
    icon: "🐇",
    colorClass: "bg-farm-mustard",
    textClass: "text-white",
  },
  {
    key: "crossingCheckDue" as const,
    title: "Crossing Check Due",
    desc: "14-day pregnancy verification",
    icon: "🔍",
    colorClass: "bg-farm-sand",
    textClass: "text-amber-900",
  },
  {
    key: "nestBoxDue" as const,
    title: "Place Nest Box",
    desc: "24 days — nest box needed",
    icon: "📦",
    colorClass: "bg-farm-rust",
    textClass: "text-white",
  },
  {
    key: "separationDue" as const,
    title: "Ready for Separation",
    desc: "30 days post-delivery",
    icon: "🔀",
    colorClass: "bg-farm-green",
    textClass: "text-white",
  },
];

export default function HomePage({ onSelectHatch }: Props) {
  const { data: hatches, isLoading: hatchesLoading } = useAllHatches();
  const { data: buckets, isLoading: bucketsLoading } = useNotificationBuckets();
  const addHatch = useAddHatch();
  const deleteHatch = useDeleteHatch();
  const addEvent = useAddEvent();
  const updateState = useUpdateHatchState();
  const qc = useQueryClient();

  const hatchMap = new Map<string, Hatch>();
  if (hatches) {
    for (const h of hatches) {
      hatchMap.set(h.id.toString(), h);
    }
  }

  // Client-side time-based state transitions
  const ranTransitions = useRef(false);
  useEffect(() => {
    if (!hatches || ranTransitions.current) return;
    ranTransitions.current = true;

    const needCheck = hatches.filter(
      (h) =>
        h.state === HatchState.crossingRecorded ||
        h.state === HatchState.crossingApproved ||
        h.state === HatchState.awaitingDelivery,
    );
    if (needCheck.length === 0) return;

    Promise.all(
      needCheck.map(async (hatch) => {
        const events = await (await getBackend()).getEventsForHatch(hatch.id);
        if (hatch.state === HatchState.crossingRecorded) {
          const ev = findLastEvent(events, EventType.crossing);
          if (ev && daysSince(ev.date) >= 14) {
            await (await getBackend()).updateHatchState(
              hatch.id,
              HatchState.crossingCheckDue,
            );
          }
        } else if (hatch.state === HatchState.crossingApproved) {
          const ev = findLastEvent(events, EventType.crossing);
          if (ev && daysSince(ev.date) >= 24) {
            await (await getBackend()).updateHatchState(
              hatch.id,
              HatchState.nestBoxDue,
            );
          }
        } else if (hatch.state === HatchState.awaitingDelivery) {
          const ev = findLastEvent(events, EventType.delivery);
          if (ev && daysSince(ev.date) >= 30) {
            await (await getBackend()).updateHatchState(
              hatch.id,
              HatchState.separationDue,
            );
          }
        }
      }),
    ).then(() => {
      qc.invalidateQueries({ queryKey: ["hatches"] });
      qc.invalidateQueries({ queryKey: ["buckets"] });
    });
  }, [hatches, qc]);

  async function handleAddHatch() {
    const num = (hatches?.length ?? 0) + 1;
    const name = `Hatch ${num}`;
    try {
      await addHatch.mutateAsync(name);
      toast.success(`Added ${name}`);
    } catch {
      toast.error("Failed to add hatch");
    }
  }

  async function handleDeleteHatch(id: bigint, name: string) {
    try {
      await deleteHatch.mutateAsync(id);
      toast.success(`Deleted ${name}`);
    } catch {
      toast.error("Failed to delete hatch");
    }
  }

  async function handleApproveCrossing(hatchId: bigint) {
    try {
      const events = await (await getBackend()).getEventsForHatch(hatchId);
      await addEvent.mutateAsync({
        hatchId,
        eventType: EventType.crossingApproved,
        date: BigInt(Date.now()),
        note: "",
      });
      const crossingEv = findLastEvent(events, EventType.crossing);
      const newState =
        crossingEv && daysSince(crossingEv.date) >= 24
          ? HatchState.nestBoxDue
          : HatchState.crossingApproved;
      await updateState.mutateAsync({ hatchId, state: newState });
      toast.success("Crossing approved!");
    } catch {
      toast.error("Action failed");
    }
  }

  async function handleFailCrossing(hatchId: bigint) {
    try {
      await addEvent.mutateAsync({
        hatchId,
        eventType: EventType.crossingFailed,
        date: BigInt(Date.now()),
        note: "",
      });
      await updateState.mutateAsync({
        hatchId,
        state: HatchState.readyForCrossing,
      });
      toast.success("Crossing marked as failed — hatch reset.");
    } catch {
      toast.error("Action failed");
    }
  }

  async function handleConfirmNestBox(hatchId: bigint) {
    try {
      await addEvent.mutateAsync({
        hatchId,
        eventType: EventType.nestBoxPlaced,
        date: BigInt(Date.now()),
        note: "",
      });
      await updateState.mutateAsync({
        hatchId,
        state: HatchState.awaitingDelivery,
      });
      toast.success("Nest box confirmed!");
    } catch {
      toast.error("Action failed");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-farm-header px-6 py-4 flex items-center gap-3 shadow-md">
        <span className="text-3xl">🐰</span>
        <h1 className="text-white font-bold text-xl tracking-wide">
          Fluffy Rabbit Farm
        </h1>
      </header>

      <main className="flex-1">
        {/* Notification Section */}
        <section className="bg-farm-cream px-6 py-6">
          <h2 className="text-foreground font-bold text-lg mb-4">
            Notifications
          </h2>
          {bucketsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : (
            <div
              data-ocid="notifications.section"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {BUCKET_CONFIG.map((cfg) => {
                const ids: bigint[] = buckets?.[cfg.key] ?? [];
                return (
                  <motion.div
                    key={cfg.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${cfg.colorClass} rounded-xl p-4 shadow-card flex flex-col gap-3 min-h-[140px]`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cfg.icon}</span>
                      <div>
                        <p
                          className={`font-semibold text-sm leading-tight ${cfg.textClass}`}
                        >
                          {cfg.title}
                        </p>
                        <p className={`text-xs opacity-80 ${cfg.textClass}`}>
                          {cfg.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ids.length === 0 && (
                        <span className={`text-xs opacity-60 ${cfg.textClass}`}>
                          None
                        </span>
                      )}
                      {ids.map((id, idx) => {
                        const hatch = hatchMap.get(id.toString());
                        const name = hatch?.name ?? `Hatch ${id}`;
                        return (
                          <div
                            key={id.toString()}
                            className="flex items-center gap-1"
                          >
                            <button
                              type="button"
                              data-ocid={`notifications.${cfg.key}.item.${idx + 1}`}
                              onClick={() => onSelectHatch(id)}
                              className="bg-white/25 hover:bg-white/40 text-xs font-medium px-2 py-1 rounded-full transition-colors cursor-pointer"
                            >
                              {name}
                            </button>
                            {cfg.key === "crossingCheckDue" && (
                              <>
                                <button
                                  type="button"
                                  data-ocid={`notifications.crossing_check.approve.${idx + 1}`}
                                  onClick={() => handleApproveCrossing(id)}
                                  title="Approve"
                                  className="text-base hover:scale-110 transition-transform cursor-pointer"
                                >
                                  ✅
                                </button>
                                <button
                                  type="button"
                                  data-ocid={`notifications.crossing_check.fail.${idx + 1}`}
                                  onClick={() => handleFailCrossing(id)}
                                  title="Fail"
                                  className="text-base hover:scale-110 transition-transform cursor-pointer"
                                >
                                  ❌
                                </button>
                              </>
                            )}
                            {cfg.key === "nestBoxDue" && (
                              <button
                                type="button"
                                data-ocid={`notifications.nest_box.confirm.${idx + 1}`}
                                onClick={() => handleConfirmNestBox(id)}
                                className="bg-white/30 hover:bg-white/50 text-xs px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer"
                              >
                                Confirm
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div
                      className={`mt-auto text-xs font-semibold ${cfg.textClass} opacity-70`}
                    >
                      {ids.length} hatch{ids.length !== 1 ? "es" : ""}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Hatch Grid */}
        <section className="bg-farm-mintBg px-6 py-6 flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground font-bold text-lg">All Hatches</h2>
            <Button
              data-ocid="hatch.add_button"
              size="sm"
              onClick={handleAddHatch}
              disabled={addHatch.isPending}
              className="bg-farm-header text-white hover:opacity-90"
            >
              {addHatch.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Add Hatch
            </Button>
          </div>

          {hatchesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((k) => (
                <Skeleton key={k} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : hatches?.length === 0 ? (
            <div
              data-ocid="hatch.empty_state"
              className="text-center py-16 text-muted-foreground"
            >
              <div className="text-5xl mb-3">🐰</div>
              <p className="font-medium">No hatches yet</p>
              <p className="text-sm">Click "Add Hatch" to get started</p>
            </div>
          ) : (
            <div
              data-ocid="hatch.list"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
            >
              {hatches?.map((hatch, idx) => (
                <motion.div
                  key={hatch.id.toString()}
                  data-ocid={`hatch.item.${idx + 1}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`${
                    CARD_TINT_CLASSES[hatch.state]
                  } rounded-xl shadow-card border border-border p-3 cursor-pointer hover:shadow-md transition-shadow relative group`}
                  onClick={() => onSelectHatch(hatch.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-sm text-foreground truncate max-w-[80%]">
                      {hatch.name}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          data-ocid={`hatch.delete_button.${idx + 1}`}
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive"
                          title="Delete hatch"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete {hatch.name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove all data for this
                            hatch.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-ocid="hatch.delete.cancel_button">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            data-ocid="hatch.delete.confirm_button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHatch(hatch.id, hatch.name);
                            }}
                            className="bg-destructive text-destructive-foreground hover:opacity-90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="text-center my-2 text-3xl">🐰</div>

                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATE_BADGE_CLASSES[hatch.state]}`}
                  >
                    {STATE_LABELS[hatch.state]}
                  </span>

                  <p className="text-[10px] text-muted-foreground mt-1">
                    Added {formatDate(hatch.createdDate)}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-farm-footer text-white text-center text-xs py-3 px-4">
        &copy; {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
