import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Hatch {
    id: bigint;
    name: string;
    createdDate: Time;
    state: HatchState;
    eventIds: Array<bigint>;
}
export type Time = bigint;
export interface Event {
    id: bigint;
    date: Time;
    note: string;
    hatchId: bigint;
    eventType: EventType;
}
export enum EventType {
    nestBoxPlaced = "nestBoxPlaced",
    crossingFailed = "crossingFailed",
    separation = "separation",
    crossingApproved = "crossingApproved",
    crossing = "crossing",
    generalNote = "generalNote",
    delivery = "delivery"
}
export enum HatchState {
    nestBoxPlaced = "nestBoxPlaced",
    separationDue = "separationDue",
    crossingApproved = "crossingApproved",
    readyForCrossing = "readyForCrossing",
    complete = "complete",
    crossingRecorded = "crossingRecorded",
    crossingCheckDue = "crossingCheckDue",
    awaitingDelivery = "awaitingDelivery",
    nestBoxDue = "nestBoxDue"
}
export interface backendInterface {
    addEvent(hatchId: bigint, eventType: EventType, date: Time, note: string): Promise<bigint>;
    addHatch(name: string): Promise<bigint>;
    deleteEvent(eventId: bigint): Promise<void>;
    deleteHatch(hatchId: bigint): Promise<void>;
    getAllHatches(): Promise<Array<Hatch>>;
    getEventsForHatch(hatchId: bigint): Promise<Array<Event>>;
    getHatch(hatchId: bigint): Promise<Hatch>;
    getNotificationBuckets(): Promise<{
        separationDue: Array<bigint>;
        readyForCrossing: Array<bigint>;
        crossingCheckDue: Array<bigint>;
        nestBoxDue: Array<bigint>;
    }>;
    updateHatchState(hatchId: bigint, newState: HatchState): Promise<void>;
}
