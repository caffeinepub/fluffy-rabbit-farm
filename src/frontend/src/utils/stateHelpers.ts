import { type Event, EventType, type Hatch, HatchState } from "../backend";

export const STATE_LABELS: Record<HatchState, string> = {
  [HatchState.readyForCrossing]: "Ready for Crossing",
  [HatchState.crossingRecorded]: "Crossing Recorded",
  [HatchState.crossingCheckDue]: "Crossing Check Due",
  [HatchState.crossingApproved]: "Crossing Approved",
  [HatchState.nestBoxDue]: "Place Nest Box",
  [HatchState.nestBoxPlaced]: "Nest Box Placed",
  [HatchState.awaitingDelivery]: "Awaiting Delivery",
  [HatchState.separationDue]: "Separation Due",
  [HatchState.complete]: "Complete",
};

export const STATE_BADGE_CLASSES: Record<HatchState, string> = {
  [HatchState.readyForCrossing]:
    "bg-white text-gray-700 border border-gray-300",
  [HatchState.crossingRecorded]: "bg-yellow-100 text-yellow-800",
  [HatchState.crossingCheckDue]: "bg-amber-200 text-amber-900",
  [HatchState.crossingApproved]: "bg-lime-100 text-lime-800",
  [HatchState.nestBoxDue]: "bg-orange-100 text-orange-800",
  [HatchState.nestBoxPlaced]: "bg-pink-100 text-pink-800",
  [HatchState.awaitingDelivery]: "bg-pink-100 text-pink-800",
  [HatchState.separationDue]: "bg-emerald-100 text-emerald-800",
  [HatchState.complete]: "bg-gray-100 text-gray-600",
};

export const CARD_TINT_CLASSES: Record<HatchState, string> = {
  [HatchState.readyForCrossing]: "bg-white",
  [HatchState.crossingRecorded]: "bg-farm-tintBeige",
  [HatchState.crossingCheckDue]: "bg-farm-tintBeige",
  [HatchState.crossingApproved]: "bg-farm-tintBeige",
  [HatchState.nestBoxDue]: "bg-farm-tintPink",
  [HatchState.nestBoxPlaced]: "bg-farm-tintPink",
  [HatchState.awaitingDelivery]: "bg-farm-tintPink",
  [HatchState.separationDue]: "bg-farm-tintMint",
  [HatchState.complete]: "bg-gray-50",
};

export const EVENT_LABELS: Record<EventType, string> = {
  [EventType.crossing]: "Crossing",
  [EventType.crossingApproved]: "Crossing Approved",
  [EventType.crossingFailed]: "Crossing Failed",
  [EventType.nestBoxPlaced]: "Nest Box Placed",
  [EventType.delivery]: "Delivery",
  [EventType.separation]: "Separation",
  [EventType.generalNote]: "General Note",
};

export const EVENT_ICONS: Record<EventType, string> = {
  [EventType.crossing]: "🐇",
  [EventType.crossingApproved]: "✅",
  [EventType.crossingFailed]: "❌",
  [EventType.nestBoxPlaced]: "📦",
  [EventType.delivery]: "🐣",
  [EventType.separation]: "🔀",
  [EventType.generalNote]: "📝",
};

export function formatDate(ts: bigint): string {
  return new Date(Number(ts)).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function toTimestamp(dateStr: string): bigint {
  return BigInt(new Date(dateStr).getTime());
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(ts: bigint): number {
  return (Date.now() - Number(ts)) / DAY_MS;
}

export function findLastEvent(
  events: Event[],
  type: EventType,
): Event | undefined {
  return [...events]
    .filter((e) => e.eventType === type)
    .sort((a, b) => Number(b.date) - Number(a.date))[0];
}
