"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export function Tabs(props: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root {...props} />;
}

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex rounded-xl bg-[#e7ebf0] p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium text-[#4a596b] transition-colors",
        "data-[state=active]:bg-white data-[state=active]:text-[#1c2430] data-[state=active]:shadow-sm",
        "focus-visible:ring-2 focus-visible:ring-[#1f4e89] focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
