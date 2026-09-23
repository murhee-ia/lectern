"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import type { WorkspaceOrganizationMembership } from "@repo/types/organization";
import { selectOrganizationAction} from "@repo/server/organization";
import { useSelectedOrganizationId } from "@/lib/hooks/use-selected-organization-id";
import { useSelectedOrganizationStore } from "@/lib/stores/server-mirror-stores/selected-organization.store";

export function OrganizationSwitcher({
  organizations,
  serverSelectedOrganizationId,
}: {
  organizations: WorkspaceOrganizationMembership[];
  serverSelectedOrganizationId: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const switcherContainerRef = useRef<HTMLDivElement>(null);

  const storeSelectedId = useSelectedOrganizationId(serverSelectedOrganizationId);
  const setStoreSelectedId = useSelectedOrganizationStore((state) => state.setSelectedOrganizationId);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (switcherContainerRef.current && !switcherContainerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedOrganization = organizations.find((organization) => organization.id === storeSelectedId);

  const handleSelect = (clickedOrganizationId: string) => {
    setOpen(false);
    if (clickedOrganizationId === storeSelectedId) return;

    const previousSelectedId = storeSelectedId;

    // Optimistic — OrganizationSummaryCard on the home page reads this same
    // store, so both it and this switcher update instantly
    setStoreSelectedId(clickedOrganizationId);
    setError(null);

    startTransition(async () => {
      const result = await selectOrganizationAction(clickedOrganizationId);
      if (result?.error) {
        setError(result.error);
        setStoreSelectedId(previousSelectedId);
      }
    });
  };

  return (
    <div className="relative" ref={switcherContainerRef}>
      <Button
        type="button"
        variant="ghost"
        className="gap-2"
        onClick={() => setOpen((value) => !value)}
        disabled={isPending}
      >
        <span className="max-w-40 truncate">{selectedOrganization?.name ?? "Select organization"}</span>
        <ChevronsUpDown className="size-4 text-foreground/50" />
      </Button>
      {open && (
        <div className="glass-card absolute top-full left-0 z-50 mt-2 w-64 p-2">
          {organizations.map((organization) => (
            <button
              key={organization.id}
              type="button"
              onClick={() => handleSelect(organization.id)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-foreground">{organization.name}</span>
                <span className="text-xs text-foreground/60 capitalize">{organization.role}</span>
              </span>
              {organization.id === storeSelectedId && (
                <Check className="size-4 shrink-0 text-highlight" />
              )}
            </button>
          ))}
        </div>
      )}
      {error && <p className="absolute top-full left-0 mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
