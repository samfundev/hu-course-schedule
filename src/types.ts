import { days, shortDay } from "./constants";
import { remap } from "./utilities";

export class Course {
  code: string;
  section: string;
  credits: string;
  timeslot: TimeSlot;

  constructor(matches: string[], timeslot: TimeSlot) {
    this.code = `${matches[1]} ${matches[2]}`;
    this.section = matches[3];
    this.credits = matches[4];
    this.timeslot = timeslot;
  }

  checkConflict(other: Course) {
    return this != other && this.timeslot.checkConflict(other.timeslot);
  }

  score() {
    if (this.timeslot.async) return 1;

    return (
      1 -
      Math.abs(
        0.5 -
          (this.timeslot.start.percentRaw() + this.timeslot.end.percentRaw()) /
            2
      )
    );
  }
}

export class Time {
  hours: number;
  minutes: number;
  minHours: number;
  maxHours: number;

  constructor(time: string, minHours: number, maxHours: number) {
    const timeRegex = /(\d{1,2}):(\d{2}) ([AP]M)/;
    const matches = timeRegex.exec(time);
    if (matches === null) {
      throw new Error("This shouldn't happen.");
    }

    this.hours = matches[1] == "12" ? 0 : parseInt(matches[1]);
    this.minutes = parseInt(matches[2]);
    this.hours += matches[3] == "PM" ? 12 : 0;

    this.minHours = minHours;
    this.maxHours = maxHours;
  }

  format(): string {
    // https://stackoverflow.com/a/54142884
    return new Date(
      `1970-01-01T${this.hours.toString().padStart(2, "0")}:${this.minutes
        .toString()
        .padStart(2, "0")}:00Z`
    ).toLocaleTimeString("en-US", {
      timeZone: "UTC",
      hour12: true,
      hour: "numeric",
      minute: "numeric",
    });
  }

  percentRaw(): number {
    return remap(this.hours + this.minutes / 60, 0, 24, 0, 1);
  }

  percent(): number {
    return remap(
      this.hours + this.minutes / 60,
      this.minHours,
      this.maxHours,
      0,
      100
    );
  }
}

export class TimeSlot {
  days: string[];
  start: Time;
  end: Time;
  async: boolean = false;

  constructor(matches: RegExpExecArray) {
    if (matches[2] === undefined) {
      this.async = true;
      this.days = [];
      return;
    }

    this.days = matches[2]
      .split("")
      .map((letter) => days[shortDay.indexOf(letter)]);
    // TODO: minHours and maxHours should be something that's handled by the schedule
    this.start = new Time(matches[3], 7, 22);
    this.end = new Time(matches[4], 7, 22);
  }

  checkConflict(other: TimeSlot) {
    if (this.async || other.async) return false;
    if (!this.days.some((day) => other.days.includes(day))) return false;

    const start = this.start.percent();
    const end = this.end.percent();
    const otherStart = other.start.percent();
    const otherEnd = other.end.percent();

    return (
      (start < otherStart && otherStart < end) ||
      (start < otherEnd && otherEnd < end) ||
      (otherStart < start && start < otherEnd) ||
      (otherStart < end && end < otherEnd)
    );
  }
}
