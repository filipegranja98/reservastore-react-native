import test from "node:test";
import assert from "node:assert/strict";
import { appointmentISO, bookingDate } from "../src/appointments";

test("schedule uses Recife timezone and rejects invalid dates and past times", () => {
  const year = new Date().getUTCFullYear() + 1;
  assert.throws(() => appointmentISO(`31/02/${year}`, "14:00"));
  assert.throws(() => appointmentISO(`01/01/${year}`, "24:01"));
  assert.throws(() => appointmentISO("01/01/2020", "14:00"));
  const future = new Date(Date.now() + 7 * 86400000);
  const day = `${String(future.getUTCDate()).padStart(2,"0")}/${String(future.getUTCMonth()+1).padStart(2,"0")}/${future.getUTCFullYear()}`;
  const iso = appointmentISO(day,"14:30");
  assert.match(iso, /T14:30:00-03:00$/);
  assert.match(bookingDate(iso), /14:30/);
});
