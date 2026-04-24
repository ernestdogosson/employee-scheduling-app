import { useEffect, useMemo, useState } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";

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
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SHIFT_COLORS: Record<string, string> = {
  morning: "bg-amber-100 text-amber-900 border-amber-200",
  afternoon: "bg-sky-100 text-sky-900 border-sky-200",
  night: "bg-indigo-100 text-indigo-900 border-indigo-200",
};

function shiftColor(name: string): string {
  return (
    SHIFT_COLORS[name.toLowerCase()] ??
    "bg-muted text-foreground border-border"
  );
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const dow = copy.getDay();
  const diff = (dow + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

  const [monday, setMonday] = useState<Date>(() => startOfWeek(new Date()));

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    [monday],
  );

  const from = isoDate(weekDates[0]);
  const to = isoDate(weekDates[6]);

  const availDays = nextDays(DAYS_AHEAD);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [shiftsData, meData] = await Promise.all([
          api.get<{ shifts: Shift[] }>("/shifts"),
          api.get<{ employee: Employee }>("/employees/me"),
        ]);
        setShifts(shiftsData.shifts);
        setMe(meData.employee);

        const availData = await api.get<{ availabilities: Availability[] }>(
          `/availability/${meData.employee.id}`,
        );
        const initial = new Set<string>();
        for (const a of availData.availabilities) {
          initial.add(makeKey(a.date.slice(0, 10), a.shiftId));
        }
        setPicked(initial);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    }
    loadInitial();
  }, []);

  useEffect(() => {
    async function loadSchedule() {
      try {
        const data = await api.get<{ entries: ScheduleEntry[] }>(
          `/schedule?from=${from}&to=${to}`,
        );
        setSchedule(data.entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load schedule");
      }
    }
    loadSchedule();
  }, [from, to]);

  const entryByDate = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    for (const e of schedule) {
      const date = e.date.slice(0, 10);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(e);
    }
    return map;
  }, [schedule]);

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

  function rangeLabel() {
    const startLabel = weekDates[0].toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const endLabel = weekDates[6].toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return `${startLabel} – ${endLabel}`;
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!me) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">My schedule</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonday(addDays(monday, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonday(startOfWeek(new Date()))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonday(addDays(monday, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">
            {rangeLabel()}
          </span>
        </div>
        <div className="grid grid-cols-7 border rounded-md overflow-hidden text-sm">
          {weekDates.map((d, i) => (
            <div
              key={`h-${i}`}
              className="bg-muted/50 border-b border-r last:border-r-0 p-2 text-center"
            >
              <div className="font-medium">{DAY_LABELS[i]}</div>
              <div className="text-muted-foreground text-xs">{d.getDate()}</div>
            </div>
          ))}
          {weekDates.map((d, i) => {
            const date = isoDate(d);
            const cellEntries = entryByDate.get(date) ?? [];
            return (
              <div
                key={`c-${i}`}
                className="border-r last:border-r-0 p-1 min-h-[80px] space-y-1"
              >
                {cellEntries.map((e) => (
                  <div
                    key={e.id}
                    className={`rounded border px-1.5 py-0.5 text-xs ${shiftColor(e.shift.name)}`}
                  >
                    {e.shift.name}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
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
            {availDays.map((date) => (
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
