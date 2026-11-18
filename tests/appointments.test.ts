import test from "node:test";
import assert from "node:assert/strict";
import { appointmentISO, bookingDate, bookingDay, moveDay, monday, onBookingDay, type Booking } from "../src/appointments";

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

test("calendar respects Recife day boundaries, week start and overnight durations",()=>{
  assert.equal(bookingDay('2026-11-16T01:00:00Z'),'2026-11-15');
  assert.equal(monday('2026-11-15'),'2026-11-09');
  assert.equal(moveDay('2026-12-31',1),'2027-01-01');
  const b={inicio_confirmado:'2026-11-15T23:30:00-03:00',duracao_minutos:120} as Booking;
  assert.equal(onBookingDay(b,'2026-11-15'),true);
  assert.equal(onBookingDay(b,'2026-11-16'),true);
  assert.equal(onBookingDay(b,'2026-11-17'),false);
});

test('service quote currency is positive and preserves centavos',async()=>{
 const {serviceQuoteValue}=await import('../src/appointments');
 assert.equal(serviceQuoteValue('150,50'),'150.50');
 assert.equal(serviceQuoteValue('1.250,99'),'1250.99');
 assert.equal(serviceQuoteValue('10.01'),'10.01');
 for(const input of ['0','-10','abc','1.234','1,234','100000000','NaN']) assert.throws(()=>serviceQuoteValue(input));
});
