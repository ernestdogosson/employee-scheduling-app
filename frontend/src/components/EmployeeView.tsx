import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Shift = { id: number; name: string };
type Employee = { id: number; firstName: string; lastName: string };
type Availability = { date: string; shiftId: number };
type ScheduleEntry = {
  id: number;
  date: string;
  shiftId: number;
  shift: Shift;
};

const DAYS_AHEAD = 7;

function nextDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function makeKey(date: string, shiftId: number) {
  return `${date}|${shiftId}`;
}

export default function EmployeeView() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [me, setMe] = useState<Employee | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const days = nextDays(DAYS_AHEAD);

  useEffect(() => {
    async function load() {
      try {
        const [shiftsData, meData] = await Promise.all([
          api.get<{ shifts: Shift[] }>("/shifts"),
          api.get<{ employee: Employee }>("/employees/me"),
        ]);
        setShifts(shiftsData.shifts);
        setMe(meData.employee);

        const [availData, scheduleData] = await Promise.all([
          api.get<{ availabilities: Availability[] }>(
            `/availability/${meData.employee.id}`,
          ),
          api.get<{ entries: ScheduleEntry[] }>(
            `/schedule?from=${todayISO()}`,
          ),
        ]);

        const initial = new Set<string>();
        for (const a of availData.availabilities) {
          // backend returns ISO datetime; trim to YYYY-MM-DD
          initial.add(makeKey(a.date.slice(0, 10), a.shiftId));
        }
        setPicked(initial);
        setSchedule(scheduleData.entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    }
    load();
  }, []);

  function toggle(date: string, shiftId: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      const key = makeKey(date, shiftId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSavedNote(null);
  }

  async function saveAvailability() {
    if (!me) return;
    setSaving(true);
    setSavedNote(null);
    setError(null);
    try {
      const availabilities = Array.from(picked).map((key) => {
        const [date, shiftId] = key.split("|");
        return { date, shiftId: Number(shiftId) };
      });
      await api.put(`/availability/${me.id}`, { availabilities });
      setSavedNote("Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!me) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-3">My schedule</h2>
        {schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming shifts.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Shift</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.date.slice(0, 10)}</TableCell>
                  <TableCell>{e.shift.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My availability (next 7 days)</h2>
          <Button onClick={saveAvailability} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
        {savedNote && (
          <p className="text-sm text-muted-foreground mb-2">{savedNote}</p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {shifts.map((s) => (
                <TableHead key={s.id}>{s.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((date) => (
              <TableRow key={date}>
                <TableCell>{date}</TableCell>
                {shifts.map((s) => (
                  <TableCell key={s.id}>
                    <input
                      type="checkbox"
                      checked={picked.has(makeKey(date, s.id))}
                      onChange={() => toggle(date, s.id)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
