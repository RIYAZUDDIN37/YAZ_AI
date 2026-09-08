"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/server/authorization/require-session";
import { createProduct } from "@/services/products/create-product";
import { updateProduct } from "@/services/products/update-product";
import { createProductCategory } from "@/services/products/create-category";
import { adjustInventory } from "@/services/products/adjust-inventory";
import {
  createProductSchema,
  updateProductSchema,
  createProductCategorySchema,
  adjustInventorySchema,
  type CreateProductInput,
  type UpdateProductInput,
  type CreateProductCategoryInput,
  type AdjustInventoryInput,
} from "@/lib/validation/products";
import { toActionError } from "@/lib/handle-error";

async function currentBusiness() {
  const { membership } = await requireMembership();
  const business = membership.organization.businesses[0];
  if (!business) redirect("/onboarding");
  return { membership, business };
}

export async function createProductAction(
  input: CreateProductInput,
): Promise<{ error?: string; productId?: string }> {
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    const product = await createProduct(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/products");
    return { productId: product.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateProductAction(
  input: UpdateProductInput,
): Promise<{ error?: string }> {
  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    const product = await updateProduct(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/products");
    revalidatePath(`/dashboard/products/${product.id}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function createProductCategoryAction(
  input: CreateProductCategoryInput,
): Promise<{ error?: string; categoryId?: string }> {
  const parsed = createProductCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    const category = await createProductCategory(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/products");
    return { categoryId: category.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function adjustInventoryAction(
  input: AdjustInventoryInput,
): Promise<{ error?: string }> {
  const parsed = adjustInventorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { membership, business } = await currentBusiness();
  try {
    const item = await adjustInventory(business.id, membership.role, parsed.data);
    revalidatePath("/dashboard/products");
    revalidatePath(`/dashboard/products/${item.productId}`);
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
