import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/** Horizontale padding incl. iPhone safe-area (viewport-fit: cover). */
export function PageMain({ children, className }: Props) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-3xl min-w-0 flex-1 py-6 pb-28",
        "pl-[max(1rem,env(safe-area-inset-left,0px))]",
        "pr-[max(1rem,env(safe-area-inset-right,0px))]",
        className,
      )}
    >
      {children}
    </main>
  );
}
