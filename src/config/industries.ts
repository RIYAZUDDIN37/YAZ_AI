import type { BusinessIndustry } from "@prisma/client";

/**
 * The reusable industry configuration described in the product spec:
 * five verticals selectable at onboarding, one shared application
 * underneath. Anything that needs to rename a concept per industry
 * (e.g. "Appointment" -> "Reservation") or default an AI employee's
 * title reads from here instead of hard-coding strings at each call site.
 */
export interface IndustryConfig {
  value: BusinessIndustry;
  label: string;
  description: string;
  defaultAgentName: string;
  defaultAgentTitle: string;
  appointmentLabel: string;
  catalogueLabel: string;
  /** Which catalogue model backs this industry's `catalogueLabel` (spec
   * section 22): `Product` for Furniture/Electronics and — despite the
   * "Menu" label — Restaurant (a menu item is priced/sold like a
   * product, not time-booked); `Service` (time-based, `durationMinutes`)
   * for Salon/Dental. Drives which dashboard route/model
   * `/dashboard/products` vs `/dashboard/services` — reads. See
   * docs/DATABASE.md. */
  catalogueType: "products" | "services";
}

export const INDUSTRIES: IndustryConfig[] = [
  {
    value: "FURNITURE",
    label: "Furniture Store",
    description:
      "Products, materials, dimensions, showroom visits, quotations.",
    defaultAgentName: "Maya",
    defaultAgentTitle: "Customer & Sales Agent",
    appointmentLabel: "Showroom Visit",
    catalogueLabel: "Products",
    catalogueType: "products",
  },
  {
    value: "RESTAURANT",
    label: "Restaurant",
    description: "Menu, dietary info, reservations, delivery orders.",
    defaultAgentName: "Nora",
    defaultAgentTitle: "Reservations & Orders Agent",
    appointmentLabel: "Reservation",
    catalogueLabel: "Menu",
    catalogueType: "products",
  },
  {
    value: "SALON",
    label: "Salon",
    description: "Services, staff, packages, appointment booking.",
    defaultAgentName: "Zara",
    defaultAgentTitle: "Booking Agent",
    appointmentLabel: "Service Appointment",
    catalogueLabel: "Services",
    catalogueType: "services",
  },
  {
    value: "DENTAL",
    label: "Dental Clinic",
    description:
      "Doctors, appointment slots, clinic policies. Never diagnoses.",
    defaultAgentName: "Aria",
    defaultAgentTitle: "Patient Coordinator",
    appointmentLabel: "Doctor Appointment",
    catalogueLabel: "Services",
    catalogueType: "services",
  },
  {
    value: "ELECTRONICS",
    label: "Electronics Store",
    description: "Specs, comparisons, budget fit, warranties, orders.",
    defaultAgentName: "Kai",
    defaultAgentTitle: "Sales & Support Agent",
    appointmentLabel: "Store Visit",
    catalogueLabel: "Products",
    catalogueType: "products",
  },
];

export function getIndustryConfig(value: BusinessIndustry): IndustryConfig {
  const found = INDUSTRIES.find((industry) => industry.value === value);
  if (!found) {
    throw new Error(`Unknown industry: ${value}`);
  }
  return found;
}
