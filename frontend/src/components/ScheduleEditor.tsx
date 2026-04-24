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

function makeKey(date: string, shiftId: number) {
  return `${date}|${shiftId}`;
}

type Props = { from: string; to: string };

export default function ScheduleEditor({ from, to }: Props) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Map<string, Set<number>>>(new Map());
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

  function nameOf(employeeId: number) {
    const e = employees.find((x) => x.id === employeeId);
    return e ? `${e.firstName} ${e.lastName}` : `#${employeeId}`;
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
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
                const available = employees.filter((e) => !assigned.has(e.id));
                return (
                  <TableCell key={date} className="align-top">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {Array.from(assigned).map((empId) => (
                        <span
                          key={empId}
                          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
                        >
                          {nameOf(empId)}
                          <button
                            type="button"
                            onClick={() => removeEmployee(date, shift.id, empId)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    {available.length > 0 && (
                      <select
                        className="text-xs border rounded px-1 py-0.5 bg-background"
                        value=""
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          if (id) addEmployee(date, shift.id, id);
                        }}
                      >
                        <option value="">+ Add</option>
                        {available.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}
                          </option>
                        ))}
                      </select>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DialogFooter className="sm:items-center">
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
