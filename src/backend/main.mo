import Time "mo:core/Time";
import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";

actor {
  type Day = {
    #monday;
    #tuesday;
    #wednesday;
    #thursday;
    #friday;
    #saturday;
    #sunday;
  };

  module Day {
    public func compare(day1 : Day, day2 : Day) : Order.Order {
      let toNat = func(day : Day) : Nat {
        switch (day) {
          case (#monday) { 0 };
          case (#tuesday) { 1 };
          case (#wednesday) { 2 };
          case (#thursday) { 3 };
          case (#friday) { 4 };
          case (#saturday) { 5 };
          case (#sunday) { 6 };
        };
      };
      Nat.compare(toNat(day1), toNat(day2));
    };
  };

  type VerificationMode = {
    #selfie;
    #mathPuzzle;
    #voicePrompt;
  };

  module VerificationMode {
    public func compare(mode1 : VerificationMode, mode2 : VerificationMode) : Order.Order {
      let toNat = func(mode : VerificationMode) : Nat {
        switch (mode) {
          case (#selfie) { 0 };
          case (#mathPuzzle) { 1 };
          case (#voicePrompt) { 2 };
        };
      };
      Nat.compare(toNat(mode1), toNat(mode2));
    };
  };

  type Alarm = {
    id : Nat;
    time : Time.Time;
    repeatDays : [Day];
    verificationMode : VerificationMode;
    sound : Text;
    enabled : Bool;
  };

  module Alarm {
    public func compare(alarm1 : Alarm, alarm2 : Alarm) : Order.Order {
      Nat.compare(alarm1.id, alarm2.id);
    };
  };

  type UserStats = {
    totalAlarmsTriggered : Nat;
    totalSuccesses : Nat;
    currentStreak : Nat;
    lastSuccessDate : Time.Time;
  };

  let alarms = Map.empty<Principal, List.List<Alarm>>();
  let userStats = Map.empty<Principal, UserStats>();

  // Alarm CRUD
  public shared ({ caller }) func createAlarm(time : Time.Time, repeatDays : [Day], verificationMode : VerificationMode, sound : Text) : async Nat {
    let userAlarms = switch (alarms.get(caller)) {
      case (null) { List.empty<Alarm>() };
      case (?list) { list };
    };

    let newId = userAlarms.size(); // Corrected size method from List class
    let alarm = {
      id = newId;
      time;
      repeatDays;
      verificationMode;
      sound;
      enabled = true;
    };

    userAlarms.add(alarm);
    alarms.add(caller, userAlarms);

    newId;
  };

  public shared ({ caller }) func updateAlarm(alarmId : Nat, time : Time.Time, repeatDays : [Day], verificationMode : VerificationMode, sound : Text, enabled : Bool) : async () {
    switch (alarms.get(caller)) {
      case (null) { Runtime.trap("No alarms found for user") };
      case (?userAlarms) {
        let updatedAlarms = userAlarms.map<Alarm, Alarm>(
          func(alarm) {
            if (alarm.id == alarmId) {
              {
                id = alarmId;
                time;
                repeatDays;
                verificationMode;
                sound;
                enabled;
              };
            } else {
              alarm;
            };
          }
        );
        alarms.add(caller, updatedAlarms);
      };
    };
  };

  public shared ({ caller }) func deleteAlarm(alarmId : Nat) : async () {
    switch (alarms.get(caller)) {
      case (null) { Runtime.trap("No alarms found for user") };
      case (?userAlarms) {
        let filteredAlarms = userAlarms.filter(func(alarm) { alarm.id != alarmId });
        alarms.add(caller, filteredAlarms);
      };
    };
  };

  public query ({ caller }) func getAlarms() : async [Alarm] {
    switch (alarms.get(caller)) {
      case (null) { [] };
      case (?userAlarms) { userAlarms.toArray().sort() };
    };
  };

  // Stats
  public query ({ caller }) func getStats() : async ?UserStats {
    userStats.get(caller);
  };
};
