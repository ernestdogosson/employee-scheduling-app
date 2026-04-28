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
import { DialogFooter } from "@/components/ui/dialog";

type Shift = { id: number; name: string };
type Employee = { id: number; firstName: string; lastName: string };
type ScheduleEntry = {
  id: number;
  date: string;
  shiftId: number;
  employeeId: number;
};

function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function isPastISO(iso: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, day] = iso.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  return d < today;
}

function makeKey(date: string, shiftId: number) {
  return `${date}|${shiftId}`;
}

const SHIFT_COLORS: Record<string, string> = {
  morning: "bg-amber-100 text-amber-900 border-amber-300",
  afternoon: "bg-sky-100 text-sky-900 border-sky-300",
  night: "bg-indigo-100 text-indigo-900 border-indigo-300",
};

function shiftColor(name: string): string {
  return (
    SHIFT_COLORS[name.toLowerCase()] ??
    "bg-muted text-foreground border-border"
  );
}

type Props = { from: string; to: string };

export default function ScheduleEditor({ from, to }: Props) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Map<string, Set<number>>>(new Map());
  const [availSet, setAvailSet] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const days = daysBetween(from, to);

  useEffect(() => {
    async function load() {
      try {
        const [shiftsData, employeesData, scheduleData] = await Promise.all([
          api.get<{ shifts: Shift[] }>("/shifts"),
          api.get<{ employees: Employee[] }>("/employees"),
          api.get<{ entries: ScheduleEntry[] }>(
            `/schedule?from=${from}&to=${to}`,
          ),
        ]);
        setShifts(shiftsData.shifts);
        setEmployees(employeesData.employees);

        const initial = new Map<string, Set<number>>();
        for (const e of scheduleData.entries) {
          const key = makeKey(e.date.slice(0, 10), e.shiftId);
          if (!initial.has(key)) initial.set(key, new Set());
          initial.get(key)!.add(e.employeeId);
        }
        setAssignments(initial);

        // fetch availability per employee
        const availResponses = await Promise.all(
          employeesData.employees.map((emp) =>
            api.get<{ availabilities: { date: string; shiftId: number }[] }>(
              `/availability/${emp.id}?from=${from}&to=${to}`,
            ),
          ),
        );
        const availSet = new Set<string>();
        availResponses.forEach((res, i) => {
          const empId = employeesData.employees[i].id;
          for (const a of res.availabilities) {
            availSet.add(`${a.date.slice(0, 10)}|${a.shiftId}|${empId}`);
          }
        });
        setAvailSet(availSet);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    }
    load();
  }, [from, to]);

  function addEmployee(date: string, shiftId: number, employeeId: number) {
    setAssignments((prev) => {
      const next = new Map(prev);
      const key = makeKey(date, shiftId);
      const set = new Set(next.get(key) ?? []);
      set.add(employeeId);
      next.set(key, set);
      return next;
    });
    setSavedNote(null);
  }

  function removeEmployee(date: string, shiftId: number, employeeId: number) {
    setAssignments((prev) => {
      const next = new Map(prev);
      const key = makeKey(date, shiftId);
      const set = new Set(next.get(key) ?? []);
      set.delete(employeeId);
      if (set.size === 0) next.delete(key);
      else next.set(key, set);
      return next;
    });
    setSavedNote(null);
  }

  async function save() {
    setSaving(true);
    setSavedNote(null);
    setError(null);
    try {
      const entries: { employeeId: number; date: string; shiftId: number }[] = [];
      for (const [key, empIds] of assignments) {
        const [date, shiftIdStr] = key.split("|");
        for (const empId of empIds) {
          entries.push({ employeeId: empId, date, shiftId: Number(shiftIdStr) });
        }
      }
      await api.put("/schedule", { from, to, entries });
      setSavedNote("Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4 min-w-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Shift</TableHead>
            {days.map((d) => (
              <TableHead key={d}>{d.slice(5)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => (
            <TableRow key={shift.id}>
              <TableCell className="font-medium">{shift.name}</TableCell>
              {days.map((date) => {
                const assigned = assignments.get(makeKey(date, shift.id)) ?? new Set<number>();
                const past = isPastISO(date);
                return (
                  <TableCell
                    key={date}
                    className={`align-top ${past ? "bg-muted/30" : ""}`}
                  >
                    <div className="flex flex-wrap gap-1">
                      {employees.map((emp) => {
                        const isAssigned = assigned.has(emp.id);
                        const isAvail = availSet.has(
                          `${date}|${shift.id}|${emp.id}`,
                        );

                        // past = read-only history
                        if (past) {
                          if (!isAssigned) return null;
                          return (
                            <span
                              key={emp.id}
                              className="inline-flex items-center rounded border border-border bg-muted/60 text-muted-foreground px-2 py-0.5 text-xs"
                            >
                              {emp.firstName} {emp.lastName}
                            </span>
                          );
                        }

                        const base =
                          "inline-flex items-center rounded border px-2 py-0.5 text-xs cursor-pointer transition";
                        let cls = base;
                        let title = "";
                        if (isAssigned) {
                          cls += " " + shiftColor(shift.name);
                          if (!isAvail) {
                            cls += " ring-2 ring-rose-300";
                            title = "Assigned but not marked available";
                          }
                        } else if (isAvail) {
                          cls +=
                            " border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";
                          title = "Available";
                        } else {
                          cls +=
                            " border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground hover:bg-muted";
                          title = "Not marked available";
                        }

                        return (
                          <button
                            key={emp.id}
                            type="button"
                            className={cls}
                            title={title}
                            onClick={() =>
                              isAssigned
                                ? removeEmployee(date, shift.id, emp.id)
                                : addEmployee(date, shift.id, emp.id)
                            }
                          >
                            {emp.firstName} {emp.lastName}
                          </button>
                        );
                      })}
                      {employees.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          No employees
                        </span>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DialogFooter className="sm:items-center" showCloseButton>
        {savedNote && (
          <p className="text-sm text-muted-foreground">{savedNote}</p>
        )}
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </div>
  );
}
