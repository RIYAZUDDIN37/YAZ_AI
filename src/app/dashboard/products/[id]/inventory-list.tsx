"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { InventoryItem, ProductVariant } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { adjustInventoryAction } from "../actions";

type ItemWithVariant = InventoryItem & { variant: ProductVariant | null };

export function InventoryList({ items }: { items: ItemWithVariant[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No inventory records.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <InventoryRow key={item.id} item={item} />
      ))}
    </ul>
  );
}

function InventoryRow({ item }: { item: ItemWithVariant }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.quantityOnHand));
  const [pending, startTransition] = useTransition();

  function save() {
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 0) {
      toast.error("Enter a whole number, 0 or more.");
      return;
    }
    startTransition(async () => {
      const result = await adjustInventoryAction({
        inventoryItemId: item.id,
        quantityOnHand: quantity,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setEditing(false);
    });
  }

  return (
    <li className="flex items-center justify-between rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">{item.variant?.name ?? "Default"}</p>
        <p className="text-xs text-muted-foreground">{item.sku}</p>
      </div>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-8 w-20"
            autoFocus
          />
          <Button size="icon-sm" variant="ghost" disabled={pending} onClick={save} aria-label="Save">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setValue(String(item.quantityOnHand));
              setEditing(false);
            }}
            aria-label="Cancel"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums">{item.quantityOnHand} on hand</span>
          <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit stock">
            <Pencil className="size-3.5" />
          </Button>
        </div>
      )}
    </li>
  );
}
