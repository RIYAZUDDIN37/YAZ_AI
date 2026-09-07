import { z } from "zod";
import { db } from "@/server/db/client";
import type { AgentTool } from "@/services/ai/types";

const inputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Keywords from what the customer is looking for, e.g. 'dining table'"),
  maxPrice: z.number().positive().optional().describe("Maximum budget in the business's currency"),
});

type Input = z.infer<typeof inputSchema>;

export interface ProductResult {
  id: string;
  name: string;
  price: number;
  category: string | null;
  description: string | null;
}

export const searchProductsTool: AgentTool<Input, ProductResult[]> = {
  name: "searchProducts",
  description:
    "Search the business's product catalogue by keyword and/or maximum price. Returns matching active products with their id, name, price, and category — use the returned id with checkInventory.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Keywords, e.g. 'dining table'" },
      maxPrice: { type: "number", description: "Maximum budget" },
    },
  },
  zodSchema: inputSchema,
  async execute(input, ctx) {
    const products = await db.product.findMany({
      where: {
        businessId: ctx.businessId,
        status: "ACTIVE",
        ...(input.maxPrice ? { price: { lte: input.maxPrice } } : {}),
        ...(input.query
          ? {
              OR: [
                { name: { contains: input.query, mode: "insensitive" } },
                { description: { contains: input.query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { category: true },
      orderBy: { price: "asc" },
      take: 5,
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      category: product.category?.name ?? null,
      description: product.description,
    }));
  },
};
