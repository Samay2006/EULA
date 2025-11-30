import React from "react";

import { cn } from "@/lib/utils";

const Sidebar = React.forwardRef(({ className, ...props }, ref) => (
  <aside ref={ref} className={cn("flex h-full w-full flex-col", className)} {...props} />
));
Sidebar.displayName = "Sidebar";

export { Sidebar };
