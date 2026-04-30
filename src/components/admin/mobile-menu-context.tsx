"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface MobileMenuContextType {
  isOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextType | undefined>(undefined);

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MobileMenuContext.Provider value={{ isOpen, toggleMenu: () => setIsOpen(!isOpen), closeMenu: () => setIsOpen(false) }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const context = useContext(MobileMenuContext);
  if (!context) {
    throw new Error("useMobileMenu must be used within MobileMenuProvider");
  }
  return context;
}
