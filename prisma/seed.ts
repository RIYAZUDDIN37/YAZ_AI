/**
 * Seeds one realistic demo business — Urban Living (furniture, Pune) — so
 * an evaluator can sign in and see a populated workspace immediately,
 * instead of the empty state a fresh sign-up produces (spec section 35,
 * "Demo Mode"). Everything here is data a real Urban Living could plausibly
 * have; nothing simulates AI activity that hasn't actually run (Phase 7+
 * generates real AgentExecution/AgentAction/LeadActivity rows once the
 * orchestration engine exists — seeding fake ones now would violate the
 * project's own "never fabricate AI activity" rule).
 *
 * Safe to re-run: every create keyed on a unique field uses upsert.
 */
import { PrismaClient, type LeadStatus, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEMO_OWNER = {
  name: "Ananya Rao",
  email: "owner@urbanliving.test",
  password: "UrbanLiving123!",
};

async function main() {
  const { business, ownerUserId } = await seedBusiness();
  const categories = await seedCategories(business.id);
  const products = await seedProducts(business.id, categories);
  await seedInventory(business.id, products);
  const customers = await seedCustomers(business.id);
  await seedLeads(business.id, customers);
  await seedConversations(business.id, ownerUserId, customers);

  console.log("\nSeed complete.");
  console.log(`  Business: ${business.name} (${business.slug})`);
  console.log(`  Sign in:  ${DEMO_OWNER.email} / ${DEMO_OWNER.password}`);
}

async function seedBusiness() {
  const passwordHash = await bcrypt.hash(DEMO_OWNER.password, 12);

  const user = await db.user.upsert({
    where: { email: DEMO_OWNER.email },
    update: {},
    create: { name: DEMO_OWNER.name, email: DEMO_OWNER.email, passwordHash },
  });

  const organization = await db.organization.upsert({
    where: { slug: "urban-living-hq" },
    update: {},
    create: {
      name: "Urban Living HQ",
      slug: "urban-living-hq",
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const business = await db.business.upsert({
    where: { slug: "urban-living" },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Urban Living",
      slug: "urban-living",
      industry: "FURNITURE",
      timezone: "Asia/Kolkata",
      currency: "INR",
      onboardedAt: new Date(),
      agents: {
        create: { name: "Maya", title: "Customer & Sales Agent", status: "ONLINE" },
      },
    },
  });

  return { business, ownerUserId: user.id };
}

const CATEGORY_DEFS = [
  { name: "Dining", slug: "dining" },
  { name: "Living Room", slug: "living-room" },
  { name: "Bedroom", slug: "bedroom" },
  { name: "Storage & Shelving", slug: "storage-shelving" },
] as const;

async function seedCategories(businessId: string) {
  const categories: Record<string, { id: string }> = {};
  for (const def of CATEGORY_DEFS) {
    categories[def.slug] = await db.productCategory.upsert({
      where: { businessId_slug: { businessId, slug: def.slug } },
      update: {},
      create: { businessId, name: def.name, slug: def.slug },
    });
  }
  return categories;
}

interface ProductDef {
  slug: string;
  name: string;
  categorySlug: (typeof CATEGORY_DEFS)[number]["slug"];
  price: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
  variants?: { sku: string; name: string; color: string }[];
}

const PRODUCT_DEFS: ProductDef[] = [
  {
    slug: "oslo-6-seater-dining-table",
    name: "Oslo 6-Seater Dining Table",
    categorySlug: "dining",
    price: "42999.00",
    description: "Solid sheesham wood dining table, seats 6 comfortably.",
    metadata: { material: "Sheesham wood", dimensions: "180 x 90 x 76 cm" },
    variants: [
      { sku: "OSLO-6-WAL", name: "Walnut finish", color: "Walnut" },
      { sku: "OSLO-6-OAK", name: "Oak finish", color: "Oak" },
    ],
  },
  {
    slug: "nordic-6-seater-dining-table",
    name: "Nordic 6-Seater Dining Table",
    categorySlug: "dining",
    price: "47500.00",
    description: "Scandinavian-style extendable dining table for 6.",
    metadata: { material: "Ash veneer", dimensions: "190 x 95 x 76 cm" },
    variants: [
      { sku: "NORD-6-NAT", name: "Natural Ash", color: "Natural Ash" },
      { sku: "NORD-6-CHR", name: "Charcoal", color: "Charcoal" },
    ],
  },
  {
    slug: "milano-4-seater-dining-set",
    name: "Milano 4-Seater Dining Set",
    categorySlug: "dining",
    price: "28500.00",
    description: "Compact 4-seater set with upholstered chairs.",
  },
  {
    slug: "haven-3-seater-sofa",
    name: "Haven 3-Seater Sofa",
    categorySlug: "living-room",
    price: "54999.00",
    description: "Fabric upholstered sofa with solid wood legs.",
    metadata: { material: "Linen blend fabric", dimensions: "210 x 90 x 85 cm" },
    variants: [
      { sku: "HAVN-3-CHG", name: "Charcoal Grey", color: "Charcoal Grey" },
      { sku: "HAVN-3-BGE", name: "Beige Linen", color: "Beige Linen" },
    ],
  },
  {
    slug: "continental-recliner-armchair",
    name: "Continental Recliner Armchair",
    categorySlug: "living-room",
    price: "32000.00",
    description: "Manual recliner armchair with footrest.",
  },
  {
    slug: "aster-coffee-table",
    name: "Aster Coffee Table",
    categorySlug: "living-room",
    price: "11200.00",
    description: "Round coffee table with tempered glass top.",
  },
  {
    slug: "sierra-king-bed-frame",
    name: "Sierra King Bed Frame",
    categorySlug: "bedroom",
    price: "38750.00",
    description: "Upholstered king-size bed frame with headboard.",
    variants: [
      { sku: "SIER-K-WAL", name: "Walnut", color: "Walnut" },
      { sku: "SIER-K-WHT", name: "White Oak", color: "White Oak" },
    ],
  },
  {
    slug: "willow-bedside-table",
    name: "Willow Bedside Table",
    categorySlug: "bedroom",
    price: "6499.00",
    description: "Two-drawer bedside table.",
  },
  {
    slug: "drift-wardrobe-3-door",
    name: "Drift Wardrobe 3-Door",
    categorySlug: "bedroom",
    price: "45000.00",
    description: "3-door wardrobe with mirror panel and internal shelving.",
  },
  {
    slug: "modul-bookshelf-5-tier",
    name: "Modul Bookshelf 5-Tier",
    categorySlug: "storage-shelving",
    price: "15800.00",
    description: "Open 5-tier bookshelf, engineered wood.",
  },
  {
    slug: "cornerstone-tv-unit",
    name: "Cornerstone TV Unit",
    categorySlug: "storage-shelving",
    price: "22400.00",
    description: "TV unit with cable management and 2 storage drawers.",
  },
];

async function seedProducts(
  businessId: string,
  categories: Record<string, { id: string }>,
) {
  const products = [];
  for (const def of PRODUCT_DEFS) {
    const product = await db.product.upsert({
      where: { businessId_slug: { businessId, slug: def.slug } },
      update: {},
      create: {
        businessId,
        categoryId: categories[def.categorySlug].id,
        name: def.name,
        slug: def.slug,
        description: def.description,
        price: def.price,
        status: "ACTIVE",
        metadata: def.metadata,
      },
    });

    const variants = [];
    for (const variantDef of def.variants ?? []) {
      const variant = await db.productVariant.upsert({
        where: { sku: variantDef.sku },
        update: {},
        create: {
          productId: product.id,
          name: variantDef.name,
          sku: variantDef.sku,
          attributes: { color: variantDef.color },
        },
      });
      variants.push(variant);
    }

    products.push({ product, variants });
  }
  return products;
}

async function seedInventory(
  businessId: string,
  products: Awaited<ReturnType<typeof seedProducts>>,
) {
  for (const { product, variants } of products) {
    if (variants.length === 0) {
      // No compound unique on (productId, variantId) — a nullable unique
      // column doesn't enforce "one row per product" for NULL variantId
      // anyway (Postgres treats NULLs as distinct), so find-or-create.
      const existing = await db.inventoryItem.findFirst({
        where: { productId: product.id, variantId: null },
      });
      if (!existing) {
        await db.inventoryItem.create({
          data: {
            businessId,
            productId: product.id,
            sku: `${product.slug.toUpperCase()}-DEFAULT`,
            quantityOnHand: randomInt(4, 30),
          },
        });
      }
      continue;
    }

    for (const variant of variants) {
      await db.inventoryItem.upsert({
        where: { variantId: variant.id },
        update: {},
        create: {
          businessId,
          productId: product.id,
          variantId: variant.id,
          sku: variant.sku,
          quantityOnHand: randomInt(2, 18),
        },
      });
    }
  }
}

const CUSTOMER_DEFS = [
  { name: "Ananya Deshmukh", email: "ananya.deshmukh@example.com", phone: "+91 98220 11234", tag: "VIP" },
  { name: "Rohan Kulkarni", email: "rohan.kulkarni@example.com", phone: "+91 98220 22345", tag: "Repeat Customer" },
  { name: "Priya Mehta", email: "priya.mehta@example.com", phone: "+91 98220 33456", tag: "Online Inquiry" },
  { name: "Vikram Joshi", email: "vikram.joshi@example.com", phone: "+91 98220 44567", tag: "Showroom Visit" },
  { name: "Sneha Patil", email: "sneha.patil@example.com", phone: "+91 98220 55678", tag: "Online Inquiry" },
] as const;

async function seedCustomers(businessId: string) {
  const customers = [];
  for (const def of CUSTOMER_DEFS) {
    const tag = await db.customerTag.upsert({
      where: { businessId_name: { businessId, name: def.tag } },
      update: {},
      create: { businessId, name: def.tag },
    });

    const existing = await db.customer.findFirst({
      where: { businessId, email: def.email },
    });

    const customer =
      existing ??
      (await db.customer.create({
        data: {
          businessId,
          name: def.name,
          email: def.email,
          phone: def.phone,
          source: def.tag === "Online Inquiry" ? "Website" : "Showroom",
          tags: { connect: { id: tag.id } },
        },
      }));

    customers.push(customer);
  }
  return customers;
}

const LEAD_DEFS: {
  customerIndex: number;
  status: LeadStatus;
  intent: string;
  value: string;
  activity: string;
}[] = [
  {
    customerIndex: 0,
    status: "WON",
    intent: "6-seater dining table for new apartment",
    value: "42999.00",
    activity: "Purchased Oslo 6-Seater Dining Table (Walnut).",
  },
  {
    customerIndex: 1,
    status: "PROPOSAL",
    intent: "Living room refresh — sofa + coffee table",
    value: "66199.00",
    activity: "Sent quotation for Haven Sofa + Aster Coffee Table.",
  },
  {
    customerIndex: 2,
    status: "QUALIFIED",
    intent: "King bed frame, budget around 40k",
    value: "38750.00",
    activity: "Requested photos of Sierra King Bed Frame finishes.",
  },
  {
    customerIndex: 3,
    status: "APPOINTMENT",
    intent: "Wants to see dining tables in person before deciding",
    value: "47500.00",
    activity: "Booked a showroom visit for this Saturday.",
  },
  {
    customerIndex: 4,
    status: "NEW",
    intent: "Asked about wardrobe delivery timelines",
    value: "45000.00",
    activity: "First message received via website inquiry form.",
  },
];

async function seedLeads(
  businessId: string,
  customers: Awaited<ReturnType<typeof seedCustomers>>,
) {
  for (const def of LEAD_DEFS) {
    const customer = customers[def.customerIndex];
    const existing = await db.lead.findFirst({
      where: { businessId, customerId: customer.id },
    });
    if (existing) continue;

    await db.lead.create({
      data: {
        businessId,
        customerId: customer.id,
        status: def.status,
        source: customer.source,
        intent: def.intent,
        value: def.value,
        activities: {
          create: [
            { type: "created", body: "Lead created." },
            { type: "note", body: def.activity },
          ],
        },
      },
    });
  }
}

const CONVERSATION_DEFS: {
  customerIndex: number;
  status: "HUMAN_HANDLING" | "RESOLVED";
  thread: { from: "CUSTOMER" | "STAFF"; body: string }[];
}[] = [
  {
    customerIndex: 0,
    status: "RESOLVED",
    thread: [
      { from: "CUSTOMER", body: "Do you have the Oslo 6-Seater in walnut, in stock?" },
      { from: "STAFF", body: "Yes, we have it in stock at the Pune showroom. Want me to hold one for you?" },
      { from: "CUSTOMER", body: "Yes please, I'll come by this weekend to pay and arrange delivery." },
    ],
  },
  {
    customerIndex: 1,
    status: "HUMAN_HANDLING",
    thread: [
      { from: "CUSTOMER", body: "Looking to refresh my living room — sofa and a coffee table. What would you recommend under 70k?" },
      { from: "STAFF", body: "The Haven 3-Seater Sofa (54,999) with the Aster Coffee Table (11,200) comes to 66,199 total — I'll send a formal quotation over." },
    ],
  },
  {
    customerIndex: 3,
    status: "HUMAN_HANDLING",
    thread: [
      { from: "CUSTOMER", body: "I'd like to see the dining tables in person before deciding." },
      { from: "STAFF", body: "Of course — does this Saturday afternoon work for a showroom visit?" },
      { from: "CUSTOMER", body: "Saturday works, thank you." },
    ],
  },
];

async function seedConversations(
  businessId: string,
  ownerUserId: string,
  customers: Awaited<ReturnType<typeof seedCustomers>>,
) {
  for (const def of CONVERSATION_DEFS) {
    const customer = customers[def.customerIndex];
    const existing = await db.conversation.findFirst({
      where: { businessId, customerId: customer.id },
    });
    if (existing) continue;

    const [first, ...rest] = def.thread;
    const conversation = await db.conversation.create({
      data: {
        businessId,
        customerId: customer.id,
        assignedToUserId: ownerUserId,
        status: def.status,
        messages: {
          create: {
            senderType: first.from,
            senderUserId: first.from === "STAFF" ? ownerUserId : null,
            body: first.body,
          },
        },
      },
    });

    for (const entry of rest) {
      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderType: entry.from,
          senderUserId: entry.from === "STAFF" ? ownerUserId : null,
          body: entry.body,
        },
      });
    }

    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
