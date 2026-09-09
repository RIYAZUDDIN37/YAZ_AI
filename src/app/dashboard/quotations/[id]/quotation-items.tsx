"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { QuotationItem } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Loader2, Plus } from "lucide-react";
import { addQuotationItemAction, removeQuotationItemAction } from "../actions";

interface CatalogueItem {
  id: string;
  name: string;
  price: unknown;
}

export function QuotationItems({
  quotationId,
  items,
  total,
  catalogueItems,
  editable,
}: {
  quotationId: string;
  items: QuotationItem[];
  total: number;
  catalogueItems: CatalogueItem[];
  editable: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [catalogueItemId, setCatalogueItemId] = useState("");
  const [quantity, setQuantity] = useState("1");

  function addItem() {
    if (!catalogueItemId) {
      toast.error("Pick an item.");
      return;
    }
    startTransition(async () => {
      const result = await addQuotationItemAction({ quotationId, catalogueItemId, quantity: Number(quantity) });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setCatalogueItemId("");
      setQuantity("1");
    });
  }

  function removeItem(itemId: string) {
    startTransition(async () => {
      const result = await removeQuotationItemAction(quotationId, { itemId });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} × ₹{Number(item.unitPrice).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm tabular-nums">
                  ₹{(Number(item.unitPrice) * item.quantity).toLocaleString("en-IN")}
                </span>
                {editable ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm font-medium">Total</span>
        <span className="text-sm font-semibold tabular-nums">₹{total.toLocaleString("en-IN")}</span>
      </div>

      {editable ? (
        <div className="flex gap-2 pt-2">
          <Select value={catalogueItemId} onValueChange={(value) => setCatalogueItemId(value ?? "")}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Pick an item">
                {(value: string | null) => catalogueItems.find((i) => i.id === value)?.name ?? "Pick an item"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {catalogueItems.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No catalogue items</div>
              ) : (
                catalogueItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} (₹{Number(item.price).toLocaleString("en-IN")})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="w-20"
          />
          <Button type="button" disabled={pending} onClick={addItem}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </div>
      ) : null}
    </div>
  );
}
