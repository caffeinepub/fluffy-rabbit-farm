import Map "mo:core/Map";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import List "mo:core/List";
import Time "mo:core/Time";

actor {
  type Event = {
    id : Nat;
    hatchId : Nat;
    eventType : EventType;
    date : Time.Time;
    note : Text;
  };

  type HatchState = {
    #readyForCrossing;
    #crossingRecorded;
    #crossingCheckDue;
    #crossingApproved;
    #nestBoxDue;
    #nestBoxPlaced;
    #awaitingDelivery;
    #separationDue;
    #complete;
  };

  type EventType = {
    #crossing;
    #delivery;
    #separation;
    #generalNote;
    #nestBoxPlaced;
    #crossingApproved;
    #crossingFailed;
  };

  type Hatch = {
    id : Nat;
    name : Text;
    state : HatchState;
    createdDate : Time.Time;
    eventIds : [Nat];
  };

  module Hatch {
    public func compareById(hatch1 : Hatch, hatch2 : Hatch) : Order.Order {
      Nat.compare(hatch1.id, hatch2.id);
    };
  };

  let hatches = Map.empty<Nat, Hatch>();
  let events = Map.empty<Nat, Event>();
  var nextHatchId = 0;
  var nextEventId = 0;

  func getHatchInternal(hatchId : Nat) : Hatch {
    switch (hatches.get(hatchId)) {
      case (null) { Runtime.trap("Hatch not found!") };
      case (?hatch) { hatch };
    };
  };

  public shared ({ caller }) func addHatch(name : Text) : async Nat {
    let hatchId = nextHatchId;
    nextHatchId += 1;

    let newHatch : Hatch = {
      id = hatchId;
      name;
      state = #readyForCrossing;
      createdDate = Time.now();
      eventIds = [];
    };

    hatches.add(hatchId, newHatch);
    hatchId;
  };

  public shared ({ caller }) func addEvent(hatchId : Nat, eventType : EventType, date : Time.Time, note : Text) : async Nat {
    ignore getHatchInternal(hatchId);
    let eventId = nextEventId;
    nextEventId += 1;

    let newEvent : Event = {
      id = eventId;
      hatchId;
      eventType;
      date;
      note;
    };

    events.add(eventId, newEvent);

    let updatedEventIds = switch (hatches.get(hatchId)) {
      case (null) { [] };
      case (?hatch) { hatch.eventIds.concat([eventId]) };
    };

    hatches.add(
      hatchId,
      switch (hatches.get(hatchId)) {
        case (null) {
          {
            id = hatchId;
            name = "Unknown";
            state = #readyForCrossing;
            createdDate = Time.now();
            eventIds = [eventId];
          };
        };
        case (?hatch) {
          {
            id = hatch.id;
            name = hatch.name;
            state = hatch.state;
            createdDate = hatch.createdDate;
            eventIds = updatedEventIds;
          };
        };
      },
    );
    eventId;
  };

  public shared ({ caller }) func updateHatchState(hatchId : Nat, newState : HatchState) : async () {
    let hatch = getHatchInternal(hatchId);
    hatches.add(
      hatchId,
      {
        id = hatch.id;
        name = hatch.name;
        state = newState;
        createdDate = hatch.createdDate;
        eventIds = hatch.eventIds;
      },
    );
  };

  public shared ({ caller }) func deleteHatch(hatchId : Nat) : async () {
    let hatch = getHatchInternal(hatchId);
    for (eventId in hatch.eventIds.values()) {
      events.remove(eventId);
    };
    hatches.remove(hatchId);
  };

  public shared ({ caller }) func deleteEvent(eventId : Nat) : async () {
    let event = switch (events.get(eventId)) {
      case (null) { Runtime.trap("Event not found!") };
      case (?event) { event };
    };

    events.remove(eventId);

    let updatedHatch = switch (hatches.get(event.hatchId)) {
      case (null) { Runtime.trap("Associated hatch not found!") };
      case (?hatch) {
        let updatedEventIds = hatch.eventIds.filter(func(id) { id != eventId });
        {
          id = hatch.id;
          name = hatch.name;
          state = hatch.state;
          createdDate = hatch.createdDate;
          eventIds = updatedEventIds;
        };
      };
    };

    hatches.add(event.hatchId, updatedHatch);
  };

  public shared ({ caller }) func getHatch(hatchId : Nat) : async Hatch {
    getHatchInternal(hatchId);
  };

  public query ({ caller }) func getAllHatches() : async [Hatch] {
    hatches.values().toArray().sort(Hatch.compareById);
  };

  public shared ({ caller }) func getEventsForHatch(hatchId : Nat) : async [Event] {
    let eventIds = switch (hatches.get(hatchId)) {
      case (null) { Runtime.trap("Hatch not found!") };
      case (?hatch) { hatch.eventIds };
    };

    eventIds.map(
      func(eventId) {
        switch (events.get(eventId)) {
          case (null) { Runtime.trap("Event not found!") };
          case (?event) { event };
        };
      }
    );
  };

  public query ({ caller }) func getNotificationBuckets() : async {
    readyForCrossing : [Nat];
    crossingCheckDue : [Nat];
    nestBoxDue : [Nat];
    separationDue : [Nat];
  } {
    let readyForCrossingList = List.empty<Nat>();
    let crossingCheckDueList = List.empty<Nat>();
    let nestBoxDueList = List.empty<Nat>();
    let separationDueList = List.empty<Nat>();

    for (hatch in hatches.values()) {
      switch (hatch.state) {
        case (#readyForCrossing) { readyForCrossingList.add(hatch.id) };
        case (#crossingCheckDue) { crossingCheckDueList.add(hatch.id) };
        case (#nestBoxDue) { nestBoxDueList.add(hatch.id) };
        case (#separationDue) { separationDueList.add(hatch.id) };
        case (_) {};
      };
    };

    {
      readyForCrossing = readyForCrossingList.toArray();
      crossingCheckDue = crossingCheckDueList.toArray();
      nestBoxDue = nestBoxDueList.toArray();
      separationDue = separationDueList.toArray();
    };
  };
};
