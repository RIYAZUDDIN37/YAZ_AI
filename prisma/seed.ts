/**
 * Seeds two realistic demo businesses so an evaluator can sign in and see
 * a populated workspace immediately, instead of the empty state a fresh
 * sign-up produces (spec section 35, "Demo Mode"):
 *   - Urban Living (Furniture, Pune) — the primary demo, deep: products,
 *     inventory, customers, leads, conversations, AI training, knowledge,
 *     an appointment.
 *   - Bright Smile Dental (Dental, Bengaluru) — Phase 15's proof that the
 *     Service catalogue type and the Dental "never diagnose" guardrail
 *     (an AgentRule, not another hardcoded prompt line) are real and
 *     industry-agnostic, not Furniture-only code paths. Lighter than
 *     Urban Living by design — it exists to prove genericity, not to be
 *     a second flagship.
 * Everything here is data a real business could plausibly have; nothing
 * simulates AI activity that hasn't actually run (Phase 7+ generates
 * real AgentExecution/AgentAction/LeadActivity rows once the
 * orchestration engine exists — seeding fake ones now would violate the
 * project's own "never fabricate AI activity" rule).
 *
 * Safe to re-run: every create keyed on a unique field uses upsert.
 */
import { PrismaClient, type LeadStatus, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { chunkText } from "../src/services/knowledge/chunk-text";

const db = new PrismaClient();

const DEMO_OWNER = {
  name: "Ananya Rao",
  email: "owner@urbanliving.test",
  password: "UrbanLiving123!",
};

const DENTAL_OWNER = {
  name: "Dr. Rohan Mehta",
  email: "owner@brightsmile.test",
  password: "BrightSmile123!",
};

async function main() {
  const { business, ownerUserId, agentId } = await seedBusiness();
  const categories = await seedCategories(business.id);
  const products = await seedProducts(business.id, categories);
  await seedInventory(business.id, products);
  const customers = await seedCustomers(business.id);
  await seedLeads(business.id, customers);
  await seedConversations(business.id, ownerUserId, customers);
  await seedAgentTraining(business.id, agentId);
  await seedAppointments(business.id, ownerUserId, customers);
  await seedAutomations(business.id);
  const dental = await seedDentalDemo();

  console.log("\nSeed complete.");
  console.log(`  Business: ${business.name} (${business.slug})`);
  console.log(`  Sign in:  ${DEMO_OWNER.email} / ${DEMO_OWNER.password}`);
  console.log(`  Business: ${dental.business.name} (${dental.business.slug})`);
  console.log(`  Sign in:  ${DENTAL_OWNER.email} / ${DENTAL_OWNER.password}`);
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

  const agent = await db.aIAgent.findFirstOrThrow({ where: { businessId: business.id } });

  return { business, ownerUserId: user.id, agentId: agent.id };
}

/**
 * Phase 9-10 demo data: a couple of owner-authored rules/goals (spec
 * section 10) and one real knowledge document, chunked the same way
 * createKnowledgeDocument() does it — so an evaluator opening the Train
 * AI Employee page sees a populated, working example instead of an empty
 * state, and the Test tab has something real to retrieve.
 */
async function seedAgentTraining(businessId: string, agentId: string) {
  const existingRules = await db.agentRule.count({ where: { businessId } });
  if (existingRules === 0) {
    await db.agentRule.createMany({
      data: [
        {
          businessId,
          agentId,
          instruction: "Never promise a delivery date — only the delivery timeframes in the knowledge base.",
          order: 0,
        },
        {
          businessId,
          agentId,
          instruction: "Never quote a discount above 10% — escalate anything larger to a human.",
          order: 1,
        },
      ],
    });
  }

  const existingGoals = await db.agentGoal.count({ where: { businessId } });
  if (existingGoals === 0) {
    await db.agentGoal.createMany({
      data: [
        { businessId, agentId, description: "Offer a showroom visit for any purchase over ₹30,000.", order: 0 },
        { businessId, agentId, description: "Capture a lead for every genuine buying intent.", order: 1 },
      ],
    });
  }

  const existingDoc = await db.knowledgeDocument.findFirst({
    where: { businessId, title: "Shipping & Delivery Policy" },
  });
  if (!existingDoc) {
    const content = [
      "Urban Living delivers across Pune within 5-7 business days of order confirmation.",
      "For custom finishes (e.g. made-to-order upholstery colors), delivery takes 3-4 weeks.",
      "Delivery is free for orders above ₹25,000; a flat ₹999 delivery fee applies below that.",
      "We do not ship outside the Pune metropolitan area at this time.",
      "Assembly is included free of charge for all wardrobe, bed frame, and dining table orders.",
    ].join("\n\n");

    const chunks = chunkText(content);
    await db.knowledgeDocument.create({
      data: {
        businessId,
        title: "Shipping & Delivery Policy",
        content,
        status: "READY",
        chunks: {
          create: chunks.map((chunkContent, chunkIndex) => ({
            businessId,
            chunkIndex,
            content: chunkContent,
          })),
        },
      },
    });
  }
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

/**
 * Phase 14 (partial): one real Appointment, linked to the Vikram Joshi
 * lead whose LeadActivity already narrates "Booked a showroom visit for
 * this Saturday" (seedLeads) — this row is what actually makes that
 * narration true instead of just a plausible-sounding string.
 */
async function seedAppointments(
  businessId: string,
  ownerUserId: string,
  customers: Awaited<ReturnType<typeof seedCustomers>>,
) {
  const vikram = customers[3];
  const existing = await db.appointment.findFirst({ where: { businessId, customerId: vikram.id } });
  if (existing) return;

  const nextSaturday = new Date();
  nextSaturday.setDate(nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7 || 7));
  nextSaturday.setHours(15, 0, 0, 0);

  await db.appointment.create({
    data: {
      businessId,
      customerId: vikram.id,
      assignedToUserId: ownerUserId,
      purpose: "Wants to see dining tables in person before deciding",
      scheduledAt: nextSaturday,
      status: "CONFIRMED",
    },
  });
}

/**
 * Phase 13: two real automations for Urban Living, exercising both
 * action types and the LEAD_STATUS_CHANGED trigger's condition
 * filtering. Fires for real the next time their trigger event happens —
 * e.g. re-run the escalation flow from Phase 7-8's live verification and
 * a real Notification row lands for the owner.
 */
async function seedAutomations(businessId: string) {
  const existing = await db.automation.count({ where: { businessId } });
  if (existing > 0) return;

  await db.automation.createMany({
    data: [
      {
        businessId,
        name: "Notify team on escalation",
        triggerEvent: "CONVERSATION_ESCALATED",
        actionType: "NOTIFY_TEAM",
        actionConfig: { message: "An AI conversation was escalated and needs attention." },
      },
      {
        businessId,
        name: "Celebrate won leads",
        triggerEvent: "LEAD_STATUS_CHANGED",
        triggerConfig: { status: "WON" },
        actionType: "ADD_LEAD_NOTE",
        actionConfig: { message: "🎉 Deal won — thanks to everyone who helped close this." },
      },
    ],
  });
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Phase 15: Bright Smile Dental, Bengaluru — proves the Service catalogue
 * type (durationMinutes, no InventoryItem) and the Dental "never
 * diagnose" guardrail are real, industry-agnostic mechanisms, not more
 * Furniture-shaped code. Deliberately lighter than Urban Living.
 */
async function seedDentalDemo() {
  const passwordHash = await bcrypt.hash(DENTAL_OWNER.password, 12);

  const user = await db.user.upsert({
    where: { email: DENTAL_OWNER.email },
    update: {},
    create: { name: DENTAL_OWNER.name, email: DENTAL_OWNER.email, passwordHash },
  });

  const organization = await db.organization.upsert({
    where: { slug: "bright-smile-hq" },
    update: {},
    create: {
      name: "Bright Smile Dental HQ",
      slug: "bright-smile-hq",
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const business = await db.business.upsert({
    where: { slug: "bright-smile-dental" },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Bright Smile Dental",
      slug: "bright-smile-dental",
      industry: "DENTAL",
      timezone: "Asia/Kolkata",
      currency: "INR",
      onboardedAt: new Date(),
      agents: {
        create: { name: "Aria", title: "Patient Coordinator", status: "ONLINE" },
      },
    },
  });

  const agent = await db.aIAgent.findFirstOrThrow({ where: { businessId: business.id } });

  const CATEGORY_DEFS = [
    { name: "General Dentistry", slug: "general-dentistry" },
    { name: "Cosmetic Dentistry", slug: "cosmetic-dentistry" },
  ] as const;
  const categories: Record<string, { id: string }> = {};
  for (const def of CATEGORY_DEFS) {
    categories[def.slug] = await db.serviceCategory.upsert({
      where: { businessId_slug: { businessId: business.id, slug: def.slug } },
      update: {},
      create: { businessId: business.id, name: def.name, slug: def.slug },
    });
  }

  const SERVICE_DEFS = [
    {
      slug: "general-checkup-cleaning",
      name: "General Checkup & Cleaning",
      categorySlug: "general-dentistry",
      durationMinutes: 30,
      price: "800.00",
      description: "Routine exam and professional cleaning.",
    },
    {
      slug: "dental-filling",
      name: "Dental Filling",
      categorySlug: "general-dentistry",
      durationMinutes: 45,
      price: "1500.00",
      description: "Composite filling for a single cavity.",
    },
    {
      slug: "root-canal-treatment",
      name: "Root Canal Treatment",
      categorySlug: "general-dentistry",
      durationMinutes: 90,
      price: "6000.00",
      description: "Full root canal treatment, single sitting where possible.",
    },
    {
      slug: "teeth-whitening",
      name: "Teeth Whitening",
      categorySlug: "cosmetic-dentistry",
      durationMinutes: 60,
      price: "4500.00",
      description: "In-clinic professional whitening treatment.",
    },
  ] as const;

  for (const def of SERVICE_DEFS) {
    await db.service.upsert({
      where: { businessId_slug: { businessId: business.id, slug: def.slug } },
      update: {},
      create: {
        businessId: business.id,
        categoryId: categories[def.categorySlug].id,
        name: def.name,
        slug: def.slug,
        description: def.description,
        durationMinutes: def.durationMinutes,
        price: def.price,
        status: "ACTIVE",
      },
    });
  }

  const CUSTOMER_DEFS = [
    { name: "Kavya Nair", email: "kavya.nair@example.com", phone: "+91 98450 11223", source: "Website" },
    { name: "Arjun Rao", email: "arjun.rao@example.com", phone: "+91 98450 22334", source: "Referral" },
    { name: "Meera Iyer", email: "meera.iyer@example.com", phone: "+91 98450 33445", source: "Walk-in" },
  ] as const;

  const customers = [];
  for (const def of CUSTOMER_DEFS) {
    const existing = await db.customer.findFirst({ where: { businessId: business.id, email: def.email } });
    const customer =
      existing ??
      (await db.customer.create({
        data: { businessId: business.id, name: def.name, email: def.email, phone: def.phone, source: def.source },
      }));
    customers.push(customer);
  }

  const LEAD_DEFS: { customerIndex: number; status: LeadStatus; intent: string; value: string; activity: string }[] = [
    {
      customerIndex: 0,
      status: "QUALIFIED",
      intent: "Wants a teeth whitening consultation before a wedding",
      value: "4500.00",
      activity: "Asked whether whitening results last through wedding photos.",
    },
    {
      customerIndex: 1,
      status: "APPOINTMENT",
      intent: "Booked in for a root canal evaluation",
      value: "6000.00",
      activity: "Booked an appointment to assess a painful molar.",
    },
  ];
  for (const def of LEAD_DEFS) {
    const customer = customers[def.customerIndex];
    const existing = await db.lead.findFirst({ where: { businessId: business.id, customerId: customer.id } });
    if (existing) continue;
    await db.lead.create({
      data: {
        businessId: business.id,
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

  // A real conversation showing what the guardrail is FOR: a patient
  // asking a diagnostic question, a human declining to diagnose over
  // chat. Once Anthropic's provider is live-verified, the same shape of
  // message should get the same non-diagnosis behavior from Aria.
  const existingConvo = await db.conversation.findFirst({
    where: { businessId: business.id, customerId: customers[2].id },
  });
  if (!existingConvo) {
    const conversation = await db.conversation.create({
      data: {
        businessId: business.id,
        customerId: customers[2].id,
        assignedToUserId: user.id,
        status: "HUMAN_HANDLING",
        messages: {
          create: {
            senderType: "CUSTOMER",
            body: "My tooth has been aching for two days, could it be a cavity?",
          },
        },
      },
    });
    await db.message.create({
      data: {
        conversationId: conversation.id,
        senderType: "STAFF",
        senderUserId: user.id,
        body: "Sorry to hear that — I can't diagnose it over chat, but let's get you in for a checkup as soon as possible. Does tomorrow afternoon work?",
      },
    });
    await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
  }

  const existingAppointment = await db.appointment.findFirst({
    where: { businessId: business.id, customerId: customers[1].id },
  });
  if (!existingAppointment) {
    const rootCanalLead = await db.lead.findFirst({
      where: { businessId: business.id, customerId: customers[1].id },
    });
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 3);
    scheduledAt.setHours(10, 30, 0, 0);
    await db.appointment.create({
      data: {
        businessId: business.id,
        customerId: customers[1].id,
        leadId: rootCanalLead?.id,
        assignedToUserId: user.id,
        purpose: "Root canal evaluation",
        scheduledAt,
        status: "SCHEDULED",
      },
    });
  }

  const existingRules = await db.agentRule.count({ where: { businessId: business.id } });
  if (existingRules === 0) {
    await db.agentRule.createMany({
      data: [
        {
          businessId: business.id,
          agentId: agent.id,
          instruction:
            "Never diagnose a dental condition, suggest a specific treatment, or comment on symptoms/X-rays — always say a dentist needs to examine them in person, and help book an appointment instead.",
          order: 0,
        },
        {
          businessId: business.id,
          agentId: agent.id,
          instruction:
            "Never quote a final price without confirming the exact procedure with a dentist first — treatment costs can change after an in-person examination.",
          order: 1,
        },
      ],
    });
  }

  const existingGoals = await db.agentGoal.count({ where: { businessId: business.id } });
  if (existingGoals === 0) {
    await db.agentGoal.createMany({
      data: [
        {
          businessId: business.id,
          agentId: agent.id,
          description: "Book a consultation for anyone describing dental pain or discomfort.",
          order: 0,
        },
        {
          businessId: business.id,
          agentId: agent.id,
          description: "Reassure anxious patients and explain what to expect at their visit.",
          order: 1,
        },
      ],
    });
  }

  return { business };
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
