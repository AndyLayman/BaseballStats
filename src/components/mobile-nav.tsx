"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "iconoir-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface MobileNavProps {
  links: { href: string; label: string }[];
}

export function MobileNav({ links }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex items-center justify-center h-10 w-10 rounded-lg hover:bg-accent transition-colors">
          <Menu className="h-6 w-6" />
        </SheetTrigger>
        <SheetContent side="right" className="w-64 glass-strong border-border/50 p-0">
          <div className="flex flex-col h-full px-5 pt-14 pb-6">
            <SheetTitle className="mb-6">
              <img src="/logos/Stats-White.svg" alt="Stats" className="h-6 w-auto dark:block hidden" />
              <img src="/logos/Stats-Black.svg" alt="Stats" className="h-6 w-auto dark:hidden block" />
            </SheetTitle>
            <nav className="flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center rounded-xl px-4 py-3 text-base font-medium transition-all active:scale-[0.98] ${
                    pathname === link.href
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-4 border-t border-border/50 flex items-center gap-2">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">Theme</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
