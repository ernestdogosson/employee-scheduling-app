import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
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

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SHIFT_DOT_COLORS: Record<string, string> = {
  morning: "bg-amber-400",
  afternoon: "bg-sky-400",
  night: "bg-indigo-400",
};

function shiftDot(name: string): string {
  return SHIFT_DOT_COLORS[name.toLowerCase()] ?? "bg-muted-foreground";
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

function isToday(d: Date): boolean {
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function isPast(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function makeKey(date: string, shiftId: number) {
  return `${date}|${shiftId}`;
}

type Tab = "schedule" | "availability";

export default function EmployeeView() {
  const [tab, setTab] = useState<Tab>("schedule");

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

  const scheduleSet = useMemo(() => {
    const set = new Set<string>();
    for (const e of schedule) {
      set.add(makeKey(e.date.slice(0, 10), e.shiftId));
    }
    return set;
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
    <div className="space-y-4">
      <div className="inline-flex rounded-md border p-1 gap-1 bg-background">
        <button
          onClick={() => setTab("schedule")}
          className={cn(
            "px-4 py-1.5 text-sm rounded transition-colors",
            tab === "schedule"
              ? "bg-slate-900 text-white font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Schedule
        </button>
        <button
          onClick={() => setTab("availability")}
          className={cn(
            "px-4 py-1.5 text-sm rounded transition-colors",
            tab === "availability"
              ? "bg-slate-900 text-white font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Availability
        </button>
      </div>

      <section className="rounded-lg border bg-card p-6 shadow-sm space-y-5">
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

      {tab === "schedule" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Shift</TableHead>
              {weekDates.map((d, i) => (
                <TableHead key={i} className="text-center">
                  <div className="font-medium">{DAY_LABELS[i]}</div>
                  <div className="text-xs mt-0.5">
                    {isToday(d) ? (
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground font-medium">
                        {d.getDate()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {d.getDate()}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                {weekDates.map((d, i) => {
                  const date = isoDate(d);
                  const scheduled = scheduleSet.has(makeKey(date, s.id));
                  const today = isToday(d);
                  return (
                    <TableCell
                      key={i}
                      className={cn("px-2 py-3", today && "bg-accent/40")}
                    >
                      {scheduled && (
                        <div
                          className={cn(
                            "h-10 w-full rounded-md",
                            shiftDot(s.name),
                          )}
                        />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {tab === "availability" && (
        <>
          <p className="text-sm text-muted-foreground">
            Tap a shift to mark yourself available. Save when done.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Day</TableHead>
                {shifts.map((s) => (
                  <TableHead key={s.id} className="text-center">
                    {s.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekDates.map((d, i) => {
                const date = isoDate(d);
                const today = isToday(d);
                const past = isPast(d);
                return (
                  <TableRow key={date} className={today ? "bg-accent/40" : ""}>
                    <TableCell>
                      <div className="font-medium">{DAY_LABELS[i]}</div>
                      <div className="text-muted-foreground text-xs">
                        {d.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </TableCell>
                    {shifts.map((s) => {
                      const key = makeKey(date, s.id);
                      const on = picked.has(key);
                      return (
                        <TableCell key={s.id} className="text-center">
                          <button
                            disabled={past}
                            onClick={() => toggle(date, s.id)}
                            className={cn(
                              "mx-auto h-8 w-8 rounded-full border-2 transition-colors",
                              past && "cursor-not-allowed opacity-40",
                              on
                                ? `${shiftDot(s.name)} border-transparent`
                                : "border-muted-foreground/30 hover:border-foreground/60",
                            )}
                            aria-label={`Toggle ${s.name} on ${date}`}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end gap-3">
            {savedNote && (
              <p className="text-sm text-muted-foreground">{savedNote}</p>
            )}
            <Button onClick={saveAvailability} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </>
      )}
      </section>
    </div>
  );
}
