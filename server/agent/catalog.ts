export interface ApprovedMaterial {
  id: string;
  title: string;
  topic: string;
  description?: string;
}

export const APPROVED_MATERIALS_CATALOG: ApprovedMaterial[] = [
  { id: "mat_101", title: "Product X efficacy brochure", topic: "efficacy", description: "Comprehensive efficacy endpoints and clinical trial outcomes." },
  { id: "mat_205", title: "Product X Phase III data PDF", topic: "phase iii", description: "Full Phase III double-blind peer-reviewed data summary." },
  { id: "mat_310", title: "Safety profile card", topic: "safety", description: "Key tolerability, contraindications, and safety metrics." },
  { id: "mat_411", title: "Patient starter guide", topic: "patient education", description: "Step-by-step guidance for patients initiating therapy." },
  { id: "mat_512", title: "Reimbursement FAQ", topic: "access", description: "Coverage criteria, copay support, and prior authorization guidance." }
];

