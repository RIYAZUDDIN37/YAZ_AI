/**
 * No seed data yet. Everything the app can currently create (user,
 * organization, business, AI agent) is created through the real sign-up +
 * onboarding flow, which is the point — Phase 3 adds realistic demo data
 * for the five industries (products, customers, conversations, etc.) per
 * docs/PRODUCT.md, and this file grows into that seed at that point.
 */
async function main() {
  console.log("No seed data defined yet — see prisma/seed.ts.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
