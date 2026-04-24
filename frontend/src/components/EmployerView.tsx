import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Users } from "lucide-react";
import ScheduleGrid from "@/components/ScheduleGrid";

type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  user: {
    email: string;
    loginCode: string;
  };
};

type EmployeesResponse = { employees: Employee[] };

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default function EmployerView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [scheduleVersion, setScheduleVersion] = useState(0);

  // create form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadEmployees() {
    try {
      const data = await api.get<EmployeesResponse>("/employees");
      setEmployees(data.employees);
      setListError(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setLoginCode("");
    setFormError(null);
  }

  async function handleDelete(emp: Employee) {
    if (!window.confirm(`Delete ${emp.firstName} ${emp.lastName}? This cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/employees/${emp.id}`);
      await loadEmployees();
      setScheduleVersion((v) => v + 1);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post("/employees", {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        loginCode,
      });
      resetForm();
      setOpen(false);
      await loadEmployees();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Employees</h2>
          <p className="text-sm text-muted-foreground">
            {employees.length} {employees.length === 1 ? "person" : "people"}
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Add employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(capitalize(e.target.value))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(capitalize(e.target.value))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail">Email</Label>
                <Input id="newEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newLoginCode">Login code</Label>
                <Input
                  id="newLoginCode"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  required
                />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {listError && <p className="text-sm text-destructive">{listError}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Login code</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Users className="h-10 w-10 opacity-30" />
                  <p className="text-sm">No employees yet</p>
                  <p className="text-xs">
                    Click "Add employee" to get started
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            employees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-medium">
                      {initials(emp.firstName, emp.lastName)}
                    </div>
                    <div className="font-medium">
                      {emp.firstName} {emp.lastName}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {emp.user.email}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {emp.user.loginCode}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {emp.phone ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(emp)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label="Delete employee"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <ScheduleGrid key={scheduleVersion} />
      </section>
    </div>
  );
}
