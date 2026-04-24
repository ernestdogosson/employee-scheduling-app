import { Fragment, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ScheduleEditor from "@/components/ScheduleEditor";

type Shift = { id: number; name: string };
type Employee = { id: number; firstName: string; lastName: string };
type ScheduleEntry = {
  id: number;
  date: string;
  shiftId: number;
  employeeId: number;
  shift: Shift;
};

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

export default function ScheduleGrid() {
  const [monday, setMonday] = useState<Date>(() => startOfWeek(new Date()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    [monday],
  );

  const from = isoDate(days[0]);
  const to = isoDate(days[6]);

  async function load() {
    try {
      const [empData, schedData] = await Promise.all([
        api.get<{ employees: Employee[] }>("/employees"),
        api.get<{ entries: ScheduleEntry[] }>(
          `/schedule?from=${from}&to=${to}`,
        ),
      ]);
      setEmployees(empData.employees);
      setEntries(schedData.entries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, [from, to]);

  const entryMap = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    for (const e of entries) {
      const date = e.date.slice(0, 10);
      const key = `${e.employeeId}|${date}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [entries]);

  function rangeLabel() {
    const startLabel = days[0].toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const endLabel = days[6].toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return `${startLabel} – ${endLabel}`;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
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

        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) load();
          }}
        >
          <DialogTrigger asChild>
            <Button>Edit schedule</Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl w-[95vw]">
            <DialogHeader>
              <DialogTitle>Edit schedule</DialogTitle>
            </DialogHeader>
            {editOpen && <ScheduleEditor from={from} to={to} />}
          </DialogContent>
        </Dialog>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] border rounded-md overflow-hidden text-sm">
        <div className="bg-muted/50 border-b border-r p-2"></div>
        {days.map((d, i) => (
          <div
            key={i}
            className="bg-muted/50 border-b border-r last:border-r-0 p-2 text-center"
          >
            <div className="font-medium">{DAY_LABELS[i]}</div>
            <div className="text-xs">
              {isToday(d) ? (
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground font-medium">
                  {d.getDate()}
                </span>
              ) : (
                <span className="text-muted-foreground">{d.getDate()}</span>
              )}
            </div>
          </div>
        ))}

        {employees.length === 0 && (
          <div className="col-span-8 p-4 text-center text-muted-foreground">
            No employees yet
          </div>
        )}

        {employees.map((emp) => (
          <Fragment key={emp.id}>
            <div className="border-b border-r p-2 font-medium">
              {emp.firstName} {emp.lastName}
            </div>
            {days.map((d, i) => {
              const date = isoDate(d);
              const cellEntries = entryMap.get(`${emp.id}|${date}`) ?? [];
              return (
                <div
                  key={i}
                  className="border-b border-r last:border-r-0 p-1 min-h-[60px] space-y-1"
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
          </Fragment>
        ))}
      </div>
    </div>
  );
}
