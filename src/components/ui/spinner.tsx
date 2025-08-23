
import { Loader2, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, ...props }: LucideProps) {
  return (
    <Loader2 className={cn("h-6 w-6 animate-spin text-primary", className)} {...props} />
  );
}
