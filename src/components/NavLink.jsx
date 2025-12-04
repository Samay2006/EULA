import { NavLink as RouterNavLink } from "react-router-dom";
import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const NavLink = forwardRef(
  (
    {
      className,
      activeClassName = "",
      pendingClassName = "",
      to,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        {...props}
        className={({ isActive, isPending }) =>
          cn(
            "relative px-3 py-1 text-sm font-medium transition-all",
            "hover:text-primary group",
            className,
            isActive && "text-primary font-semibold drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]",
            isPending && pendingClassName,
            activeClassName
          )
        }
      >
        {({ isActive }) => (
          <span className="relative flex items-center">
            {children}

            {/* GEN Z UNDERLINE */}
            <motion.span
              layoutId="underline"
              className={cn(
                "absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-primary",
                !isActive && "hidden"
              )}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </span>
        )}
      </RouterNavLink>
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };
