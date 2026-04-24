import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 bg-muted/30">
      <div className="h-14 w-14 rounded-xl bg-slate-900 text-white flex items-center justify-center text-2xl font-bold">
        S
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h1 className="text-5xl font-bold tracking-tight">Scheduler</h1>
        <p className="text-lg text-muted-foreground">
          Plan shifts. Share availability. Done.
        </p>
      </div>
      <Button asChild size="lg">
        <Link to="/login">Sign in</Link>
      </Button>
    </main>
  );
}
