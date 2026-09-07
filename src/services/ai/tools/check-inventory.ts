import { z } from "zod";
import { db } from "@/server/db/client";
import type { AgentTool } from "@/services/ai/types";

const inputSchema = z.object({
  productId: z.string().optional().describe("A product id, typically from a prior searchProducts call"),
  productName: z.string().optional().describe("A product name, if the id isn't known"),
});

type Input = z.infer<typeof inputSchema>;

export interface InventoryResult {
  productName: string;
  totalOnHand: number;
  variants: { name: string; sku: string; onHand: number }[];
}

export const checkInventoryTool: AgentTool<Input, InventoryResult | { error: string }> = {
  name: "checkInventory",
  description:
    "Check real stock levels for a product, by id (preferred, from searchProducts) or by name. Returns total quantity on hand, broken down by variant if the product has any.",
  inputSchema: {
    type: "object",
    properties: {
      productId: { type: "string" },
      productName: { type: "string" },
    },
  },
  zodSchema: inputSchema,
  async execute(input, ctx) {
    if (!input.productId && !input.productName) {
      return { error: "Provide either productId or productName." };
    }

    const product = await db.product.findFirst({
      where: {
        businessId: ctx.businessId,
        ...(input.productId
          ? { id: input.productId }
          : { name: { contains: input.productName, mode: "insensitive" } }),
      },
      include: {
        inventoryItems: { include: { variant: true } },
      },
    });

    if (!product) {
      return { error: "No matching product found." };
    }

    const totalOnHand = product.inventoryItems.reduce(
      (sum, item) => sum + item.quantityOnHand,
      0,
    );

    return {
      productName: product.name,
      totalOnHand,
      variants: product.inventoryItems
        .filter((item) => item.variant)
        .map((item) => ({
          name: item.variant!.name,
          sku: item.sku,
          onHand: item.quantityOnHand,
        })),
    };
  },
};
