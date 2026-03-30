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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import type { Event } from "../backend";
import {
  EventType,
  HatchState,
  useAddEvent,
  useDeleteEvent,
  useHatch,
  useHatchEvents,
  useUpdateHatchState,
} from "../hooks/useQueries";
import { getBackend } from "../utils/backendClient";
import {
  EVENT_ICONS,
  EVENT_LABELS,
  STATE_BADGE_CLASSES,
  STATE_LABELS,
  daysSince,
  findLastEvent,
  formatDate,
  toTimestamp,
  todayStr,
} from "../utils/stateHelpers";

interface Props {
  hatchId: bigint;
  onBack: () => void;
}

export default function HatchDetailPage({ hatchId, onBack }: Props) {
  const { data: hatch, isLoading: hatchLoading } = useHatch(hatchId);
  const { data: events, isLoading: eventsLoading } = useHatchEvents(hatchId);
  const addEvent = useAddEvent();
  const deleteEvent = useDeleteEvent();
  const updateState = useUpdateHatchState();

  const [crossingDate, setCrossingDate] = useState(todayStr());
  const [crossingNote, setCrossingNote] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(todayStr());
  const [deliveryNote, setDeliveryNote] = useState("");
  const [separationDate, setSeparationDate] = useState(todayStr());
  const [separationNote, setSeparationNote] = useState("");
  const [noteDate, setNoteDate] = useState(todayStr());
  const [noteText, setNoteText] = useState("");

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRecordCrossing() {
    if (!hatch) return;
    setIsSubmitting(true);
    try {
      await addEvent.mutateAsync({
        hatchId,
        eventType: EventType.crossing,
        date: toTimestamp(crossingDate),
        note: crossingNote,
      });
      await updateState.mutateAsync({
        hatchId,
        state: HatchState.crossingRecorded,
      });
      toast.success("Crossing recorded!");
      setCrossingNote("");
    } catch {
      toast.error("Failed to record crossing");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApproveCrossing() {
    setIsSubmitting(true);
    try {
      const evList = await (await getBackend()).getEventsForHatch(hatchId);
      await addEvent.mutateAsync({
        hatchId,
        eventType: EventType.crossingApproved,
        date: BigInt(Date.now()),
        note: "",
      });
      const crossingEv = findLastEvent(evList, EventType.crossing);
      const newState =
        crossingEv && daysSince(crossingEv.date) >= 24
          ? HatchState.nestBoxDue
          : HatchState.crossingApproved;
      await updateState.mutateAsync({ hatchId, state: newState });
      toast.success("Crossing approved!");
    } catch {
      toast.error("Failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFailCrossing() {
    setIsSubmitting(true);
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
      toast.error("Failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmNestBox() {
    setIsSubmitting(true);
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
      toast.error("Failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecordDelivery() {
    setIsSubmitting(true);
    try {
      await addEvent.mutateAsync({
        hatchId,
        eventType: EventType.delivery,
        date: toTimestamp(deliveryDate),
        note: deliveryNote,
      });
      await updateState.mutateAsync({
        hatchId,
        state: HatchState.awaitingDelivery,
      });
      toast.success("Delivery recorded!");
      setDeliveryNote("");
    } catch {
      toast.error("Failed to record delivery");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecordSeparation() {
    setIsSubmitting(true);
    try {
      await addEvent.mutateAsync({
        hatchId,
        eventType: EventType.separation,
        date: toTimestamp(separationDate),
        note: separationNote,
      });
      await updateState.mutateAsync({
        hatchId,
        state: HatchState.readyForCrossing,
      });
      toast.success("Separation recorded! Hatch reset.");
      setSeparationNote("");
    } catch {
      toast.error("Failed to record separation");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setIsSubmitting(true);
    try {
      await addEvent.mutateAsync({
        hatchId,
        eventType: EventType.generalNote,
        date: toTimestamp(noteDate),
        note: noteText,
      });
      toast.success("Note added!");
      setNoteText("");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditEvent(ev: Event) {
    setEditingEvent(ev);
    setEditDate(new Date(Number(ev.date)).toISOString().slice(0, 10));
    setEditNote(ev.note);
  }

  async function saveEditEvent() {
    if (!editingEvent) return;
    setIsSubmitting(true);
    try {
      await deleteEvent.mutateAsync({ eventId: editingEvent.id, hatchId });
      await addEvent.mutateAsync({
        hatchId,
        eventType: editingEvent.eventType,
        date: toTimestamp(editDate),
        note: editNote,
      });
      toast.success("Event updated!");
      setEditingEvent(null);
    } catch {
      toast.error("Failed to update");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteEvent(ev: Event) {
    try {
      await deleteEvent.mutateAsync({ eventId: ev.id, hatchId });
      toast.success("Event deleted.");
    } catch {
      toast.error("Failed to delete");
    }
  }

  const sortedEvents = events
    ? [...events].sort((a, b) => Number(b.date) - Number(a.date))
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-farm-header px-6 py-4 flex items-center gap-3 shadow-md">
        <Button
          data-ocid="hatch_detail.back_button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-white hover:bg-white/20 mr-1"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <span className="text-3xl">🐰</span>
        <h1 className="text-white font-bold text-xl tracking-wide">
          Fluffy Rabbit Farm
        </h1>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Hatch Title */}
        {hatchLoading ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <h2
              className="text-2xl font-bold text-foreground"
              data-ocid="hatch_detail.panel"
            >
              {hatch?.name}
            </h2>
            {hatch && (
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${STATE_BADGE_CLASSES[hatch.state]}`}
              >
                {STATE_LABELS[hatch.state]}
              </span>
            )}
          </div>
        )}

        {/* Action Section */}
        {hatch && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border shadow-card p-5 space-y-4"
          >
            <h3 className="font-semibold text-base text-foreground">Actions</h3>

            {/* Ready for Crossing */}
            {hatch.state === HatchState.readyForCrossing && (
              <div
                data-ocid="hatch_detail.crossing.panel"
                className="space-y-3"
              >
                <p className="text-sm text-muted-foreground">
                  Record a crossing event for this hatch.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="crossing-date">Date</Label>
                    <Input
                      id="crossing-date"
                      data-ocid="hatch_detail.crossing.input"
                      type="date"
                      value={crossingDate}
                      onChange={(e) => setCrossingDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="crossing-note">Note (optional)</Label>
                    <Input
                      id="crossing-note"
                      data-ocid="hatch_detail.crossing.textarea"
                      placeholder="e.g. Buck #3"
                      value={crossingNote}
                      onChange={(e) => setCrossingNote(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  data-ocid="hatch_detail.crossing.submit_button"
                  onClick={handleRecordCrossing}
                  disabled={isSubmitting}
                  className="bg-farm-mustard text-amber-900 hover:opacity-90 font-semibold"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    "🐇"
                  )}
                  Record Crossing
                </Button>
              </div>
            )}

            {/* Crossing Check Due */}
            {hatch.state === HatchState.crossingCheckDue && (
              <div
                data-ocid="hatch_detail.crossing_check.panel"
                className="space-y-3"
              >
                <p className="text-sm font-medium text-amber-800 bg-amber-50 rounded-lg p-3">
                  14 days have passed. Was the crossing successful?
                </p>
                <div className="flex gap-3">
                  <Button
                    data-ocid="hatch_detail.crossing_check.approve_button"
                    onClick={handleApproveCrossing}
                    disabled={isSubmitting}
                    className="bg-green-600 text-white hover:bg-green-700 flex-1"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      "✅"
                    )}
                    Approve — Successful
                  </Button>
                  <Button
                    data-ocid="hatch_detail.crossing_check.fail_button"
                    onClick={handleFailCrossing}
                    disabled={isSubmitting}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      "❌"
                    )}
                    Mark Failed
                  </Button>
                </div>
              </div>
            )}

            {/* Crossing Recorded — waiting */}
            {hatch.state === HatchState.crossingRecorded && (
              <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
                ⏳ Crossing recorded. Pregnancy check will be available after 14
                days.
              </p>
            )}

            {/* Crossing Approved — waiting for nest box */}
            {hatch.state === HatchState.crossingApproved && (
              <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
                ✅ Crossing approved. Nest box placement will be needed at 24
                days.
              </p>
            )}

            {/* Nest Box Due */}
            {hatch.state === HatchState.nestBoxDue && (
              <div
                data-ocid="hatch_detail.nest_box.panel"
                className="space-y-3"
              >
                <p className="text-sm font-medium text-orange-800 bg-orange-50 rounded-lg p-3">
                  📦 Time to place the nest box (24 days from crossing).
                </p>
                <Button
                  data-ocid="hatch_detail.nest_box.confirm_button"
                  onClick={handleConfirmNestBox}
                  disabled={isSubmitting}
                  className="bg-farm-rust text-white hover:opacity-90"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    "📦"
                  )}
                  Confirm Nest Box Placed
                </Button>
              </div>
            )}

            {/* Awaiting Delivery / Nest Box Placed */}
            {(hatch.state === HatchState.awaitingDelivery ||
              hatch.state === HatchState.nestBoxPlaced) && (
              <div
                data-ocid="hatch_detail.delivery.panel"
                className="space-y-3"
              >
                <p className="text-sm text-muted-foreground">
                  Record the delivery when the kits are born.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="delivery-date">Delivery Date</Label>
                    <Input
                      id="delivery-date"
                      data-ocid="hatch_detail.delivery.input"
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="delivery-note">Note</Label>
                    <Input
                      id="delivery-note"
                      data-ocid="hatch_detail.delivery.textarea"
                      placeholder="e.g. 8 kits born"
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  data-ocid="hatch_detail.delivery.submit_button"
                  onClick={handleRecordDelivery}
                  disabled={isSubmitting}
                  className="bg-pink-500 text-white hover:bg-pink-600"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    "🐣"
                  )}
                  Record Delivery
                </Button>
              </div>
            )}

            {/* Separation Due */}
            {hatch.state === HatchState.separationDue && (
              <div
                data-ocid="hatch_detail.separation.panel"
                className="space-y-3"
              >
                <p className="text-sm font-medium text-emerald-800 bg-emerald-50 rounded-lg p-3">
                  🔀 30 days have passed since delivery. Time to separate the
                  kits.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="sep-date">Separation Date</Label>
                    <Input
                      id="sep-date"
                      data-ocid="hatch_detail.separation.input"
                      type="date"
                      value={separationDate}
                      onChange={(e) => setSeparationDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sep-note">Note</Label>
                    <Input
                      id="sep-note"
                      data-ocid="hatch_detail.separation.textarea"
                      placeholder="e.g. 7 kits separated"
                      value={separationNote}
                      onChange={(e) => setSeparationNote(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  data-ocid="hatch_detail.separation.submit_button"
                  onClick={handleRecordSeparation}
                  disabled={isSubmitting}
                  className="bg-farm-green text-white hover:opacity-90"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    "🔀"
                  )}
                  Record Separation
                </Button>
              </div>
            )}
          </motion.section>
        )}

        {/* General Notes */}
        <section className="bg-card rounded-xl border border-border shadow-card p-5 space-y-3">
          <h3 className="font-semibold text-base text-foreground">
            📝 Add General Note
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="note-date">Date</Label>
              <Input
                id="note-date"
                data-ocid="hatch_detail.note.input"
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="note-text">Note</Label>
              <Textarea
                id="note-text"
                data-ocid="hatch_detail.note.textarea"
                placeholder="Health observation, weight, behaviour..."
                rows={2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
            </div>
          </div>
          <Button
            data-ocid="hatch_detail.note.submit_button"
            onClick={handleAddNote}
            disabled={isSubmitting || !noteText.trim()}
            variant="outline"
            className="border-farm-header text-farm-header hover:bg-farm-header hover:text-white"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save Note
          </Button>
        </section>

        {/* History */}
        <section className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-semibold text-base text-foreground mb-4">
            History
          </h3>
          {eventsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : sortedEvents.length === 0 ? (
            <div
              data-ocid="hatch_detail.history.empty_state"
              className="text-center py-8 text-muted-foreground"
            >
              <p className="text-sm">No events recorded yet.</p>
            </div>
          ) : (
            <div data-ocid="hatch_detail.history.list" className="space-y-2">
              <AnimatePresence>
                {sortedEvents.map((ev, idx) => (
                  <motion.div
                    key={ev.id.toString()}
                    data-ocid={`hatch_detail.history.item.${idx + 1}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="text-xl mt-0.5">
                      {EVENT_ICONS[ev.eventType]}
                    </span>
                    <div className="flex-1 min-w-0">
                      {editingEvent?.id === ev.id ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              data-ocid="hatch_detail.history.edit.input"
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="h-7 text-xs"
                            />
                            <Input
                              data-ocid="hatch_detail.history.edit.textarea"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              className="h-7 text-xs flex-1"
                              placeholder="Note"
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              data-ocid="hatch_detail.history.edit.save_button"
                              size="sm"
                              onClick={saveEditEvent}
                              disabled={isSubmitting}
                              className="h-6 text-xs px-2"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              data-ocid="hatch_detail.history.edit.cancel_button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingEvent(null)}
                              className="h-6 text-xs px-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {EVENT_LABELS[ev.eventType]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(ev.date)}
                            </span>
                          </div>
                          {ev.note && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {ev.note}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {editingEvent?.id !== ev.id && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          data-ocid={`hatch_detail.history.edit_button.${idx + 1}`}
                          onClick={() => startEditEvent(ev)}
                          className="p-1.5 rounded hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              data-ocid={`hatch_detail.history.delete_button.${idx + 1}`}
                              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this event?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {EVENT_LABELS[ev.eventType]} on{" "}
                                {formatDate(ev.date)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-ocid="hatch_detail.history.delete.cancel_button">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                data-ocid="hatch_detail.history.delete.confirm_button"
                                onClick={() => handleDeleteEvent(ev)}
                                className="bg-destructive text-destructive-foreground hover:opacity-90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
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
