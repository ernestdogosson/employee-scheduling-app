import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Scheduler</h1>
        <p className="text-muted-foreground">Employee scheduling, simplified.</p>
      </div>
      <Button asChild>
        <Link to="/login">Sign in</Link>
      </Button>
    </main>
  );
}
