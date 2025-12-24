import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-bold text-4xl tracking-tight">404</h2>
        <p className="font-medium text-muted-foreground text-xl">
          Page not found
        </p>
        <p className="max-w-[500px] text-muted-foreground text-sm">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>
      </div>
      <Link href="/">
        <Button className="gap-2" variant="default">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </Link>
    </div>
  );
}
