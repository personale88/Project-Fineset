import { PRODUCT_CATEGORY_LABELS, PRODUCT_CATEGORY_VALUES } from "@/lib/constants/product-categories";
import type { FeatureSchemaConfig } from "@/lib/import-engine/types";

const CUSTOMER_TYPE_VALUES = ["NEW", "REPEAT", "VIP"] as const;
const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  NEW: "New",
  REPEAT: "Repeat",
  VIP: "VIP",
};

const VISIT_TYPE_VALUES = ["WALK_IN", "APPOINTMENT"] as const;
const VISIT_TYPE_LABELS: Record<string, string> = {
  WALK_IN: "Walk-in",
  APPOINTMENT: "Appointment",
};

const SOURCE_CHANNEL_VALUES = [
  "ORGANIC_WALK_IN",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "INTERNET",
  "PHONE",
  "USER_CALLS",
  "TANISHQ_REF",
  "CARATLANE_REF",
  "OTHER",
] as const;
const SOURCE_CHANNEL_LABELS: Record<string, string> = {
  ORGANIC_WALK_IN: "Organic Walk-in",
  REFERRAL: "Referral",
  SOCIAL_MEDIA: "Social Media",
  INTERNET: "Internet",
  PHONE: "Phone",
  USER_CALLS: "User Calls",
  TANISHQ_REF: "Tanishq Reference",
  CARATLANE_REF: "Caratlane Reference",
  OTHER: "Other",
};

const PURCHASE_STATUS_VALUES = ["PURCHASED", "NOT_PURCHASED"] as const;
const PURCHASE_STATUS_LABELS: Record<string, string> = {
  PURCHASED: "Purchased",
  NOT_PURCHASED: "Not Purchased",
};

const INTENT_TIER_VALUES = ["HOT", "WARM", "COLD", "BROWSING"] as const;
const INTENT_TIER_LABELS: Record<string, string> = {
  HOT: "Hot",
  WARM: "Warm",
  COLD: "Cold",
  BROWSING: "Browsing",
};

const BUDGET_RANGE_VALUES = ["UNDER_15K", "K15_50K", "K50_1L", "ABOVE_1L", "NOT_STATED"] as const;
const BUDGET_RANGE_LABELS: Record<string, string> = {
  UNDER_15K: "Under ₹15K",
  K15_50K: "₹15K – ₹50K",
  K50_1L: "₹50K – ₹1L",
  ABOVE_1L: "Above ₹1L",
  NOT_STATED: "Not stated",
};

const GENDER_VALUES = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] as const;
const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

const AGE_GROUP_VALUES = ["18-25", "26-35", "36-50", "50+"] as const;
const AGE_GROUP_LABELS: Record<string, string> = {
  "18-25": "18–25",
  "26-35": "26–35",
  "36-50": "36–50",
  "50+": "50+",
};

const NO_PURCHASE_REASON_VALUES = [
  "BUDGET",
  "DESIGN_NOT_LIKED",
  "EXPLORING",
  "COMPETITOR",
  "PAYMENT_ISSUE",
  "WILL_VISIT_AGAIN",
] as const;
const NO_PURCHASE_REASON_LABELS: Record<string, string> = {
  BUDGET: "Budget",
  DESIGN_NOT_LIKED: "Design not liked",
  EXPLORING: "Exploring",
  COMPETITOR: "Competitor",
  PAYMENT_ISSUE: "Payment issue",
  WILL_VISIT_AGAIN: "Will visit again",
};

const PURCHASE_OCCASION_VALUES = ["WEDDING", "ANNIVERSARY", "GIFT", "SELF", "FESTIVAL"] as const;
const PURCHASE_OCCASION_LABELS: Record<string, string> = {
  WEDDING: "Wedding",
  ANNIVERSARY: "Anniversary",
  GIFT: "Gift",
  SELF: "Self",
  FESTIVAL: "Festival",
};

const METAL_KT_VALUES = [
  "GOLD_14KT",
  "GOLD_18KT",
  "GOLD_22KT",
  "DIAMOND",
  "SILVER",
] as const;
const METAL_KT_LABELS: Record<string, string> = {
  GOLD_14KT: "Gold 14KT",
  GOLD_18KT: "Gold 18KT",
  GOLD_22KT: "Gold 22KT",
  DIAMOND: "Diamond",
  SILVER: "Silver",
};

const SCHEME_PRODUCT_VALUES = ["GHS", "GPP", "NONE"] as const;
const SCHEME_PRODUCT_LABELS: Record<string, string> = {
  GHS: "GHS — Gold Harvest Scheme",
  GPP: "JPP — Jold Purchase Plan",
  NONE: "None",
};

const ENROLLMENT_OUTCOME_VALUES = [
  "ENROLLED_GHS",
  "ENROLLED_GPP",
  "ENROLLED_BOTH",
  "INTERESTED",
  "DECLINED",
  "CALLBACK",
] as const;
const ENROLLMENT_OUTCOME_LABELS: Record<string, string> = {
  ENROLLED_GHS: "Enrolled in GHS",
  ENROLLED_GPP: "Enrolled in JPP",
  ENROLLED_BOTH: "Enrolled in both",
  INTERESTED: "Interested — not enrolled yet",
  DECLINED: "Declined",
  CALLBACK: "Callback requested",
};

const DECLINE_REASON_VALUES = [
  "BUDGET",
  "ALREADY_ENROLLED",
  "NOT_INTERESTED",
  "NEEDS_TIME",
  "TRUST_CONCERNS",
  "COMPETITOR_SCHEME",
] as const;
const DECLINE_REASON_LABELS: Record<string, string> = {
  BUDGET: "Budget constraints",
  ALREADY_ENROLLED: "Already enrolled elsewhere",
  NOT_INTERESTED: "Not interested",
  NEEDS_TIME: "Needs more time",
  TRUST_CONCERNS: "Trust / clarity concerns",
  COMPETITOR_SCHEME: "Competitor scheme",
};

export const visitLogSchema: FeatureSchemaConfig = {
  featureKey: "visit_log",
  featureLabel: "Visit Log",
  supabaseTable: "visits",
  customerTable: "customers",
  customerIdColumn: "customerId",
  dedupeKeys: ["phone"],
  columns: [
    {
      frontendLabel: "Customer Name",
      supabaseColumn: "name",
      type: "string",
      required: true,
      isCustomerField: true,
      synonyms: [
        "customer name",
        "client name",
        "party name",
        "member name",
        "guest name",
        "visitor name",
        "cust name",
        "customer",
      ],
    },
    {
      frontendLabel: "Customer Phone",
      supabaseColumn: "phone",
      type: "phone",
      required: true,
      isCustomerField: true,
      isDedupeKey: true,
      synonyms: [
        "mobile",
        "mob",
        "contact",
        "phone number",
        "cell",
        "mobile no",
        "mob no",
        "contact no",
        "whatsapp",
        "ph no",
        "customer phone",
      ],
    },
    {
      frontendLabel: "Customer Email",
      supabaseColumn: "email",
      type: "email",
      required: false,
      isCustomerField: true,
      synonyms: ["email", "e-mail", "email address", "mail", "email id"],
    },
    {
      frontendLabel: "Visit Date",
      supabaseColumn: "visitDate",
      type: "date",
      required: true,
      dateFormats: ["dd/MM/yyyy", "MM-dd-yyyy", "yyyy-MM-dd", "d MMM yyyy"],
      synonyms: [
        "date",
        "visit",
        "appointment date",
        "date of visit",
        "visit dt",
        "visited on",
        "sale date",
      ],
    },
    {
      frontendLabel: "In Time",
      supabaseColumn: "inTime",
      type: "time",
      required: false,
      synonyms: ["in time", "check in", "entry time", "arrival time", "time in"],
    },
    {
      frontendLabel: "Out Time",
      supabaseColumn: "outTime",
      type: "time",
      required: false,
      synonyms: ["out time", "check out", "exit time", "departure time", "time out"],
    },
    {
      frontendLabel: "Duration (mins)",
      supabaseColumn: "durationMins",
      type: "number",
      required: false,
      synonyms: ["duration", "visit duration", "total duration", "time spent", "minutes"],
    },
    {
      frontendLabel: "Staff Name",
      supabaseColumn: "staffId",
      type: "lookup",
      required: true,
      lookupTable: "staff",
      lookupDisplayColumn: "name",
      lookupKeyColumn: "id",
      synonyms: [
        "staff",
        "employee",
        "consultant",
        "attended by",
        "served by",
        "rso name",
        "sales person",
        "handled by",
        "rso",
      ],
    },
    {
      frontendLabel: "Customer Type",
      supabaseColumn: "customerType",
      type: "enum",
      required: false,
      enumValues: CUSTOMER_TYPE_VALUES,
      enumLabels: CUSTOMER_TYPE_LABELS,
      synonyms: ["customer type", "client type", "new or repeat", "member type"],
    },
    {
      frontendLabel: "Visit Type",
      supabaseColumn: "visitType",
      type: "enum",
      required: false,
      enumValues: VISIT_TYPE_VALUES,
      enumLabels: VISIT_TYPE_LABELS,
      synonyms: ["visit type", "type of visit", "walk in", "appointment type"],
    },
    {
      frontendLabel: "Source / Channel",
      supabaseColumn: "sourceChannel",
      type: "enum",
      required: false,
      enumValues: SOURCE_CHANNEL_VALUES,
      enumLabels: SOURCE_CHANNEL_LABELS,
      synonyms: ["source", "channel", "source channel", "how they found us", "referral source"],
    },
    {
      frontendLabel: "Area / Locality",
      supabaseColumn: "area",
      type: "string",
      required: false,
      synonyms: ["area", "locality", "neighbourhood", "location", "territory"],
    },
    {
      frontendLabel: "Address",
      supabaseColumn: "address",
      type: "string",
      required: false,
      synonyms: ["address", "full address", "street address", "residence"],
    },
    {
      frontendLabel: "Profession",
      supabaseColumn: "profession",
      type: "string",
      required: false,
      synonyms: ["profession", "occupation", "job", "work"],
    },
    {
      frontendLabel: "Gender",
      supabaseColumn: "gender",
      type: "enum",
      required: false,
      enumValues: GENDER_VALUES,
      enumLabels: GENDER_LABELS,
      synonyms: ["gender", "sex"],
    },
    {
      frontendLabel: "Age Group",
      supabaseColumn: "ageGroup",
      type: "enum",
      required: false,
      enumValues: AGE_GROUP_VALUES,
      enumLabels: AGE_GROUP_LABELS,
      synonyms: ["age group", "age range", "age bracket", "age"],
    },
    {
      frontendLabel: "Date of Birth",
      supabaseColumn: "dateOfBirth",
      type: "date",
      required: false,
      dateFormats: ["dd/MM/yyyy", "MM-dd-yyyy", "yyyy-MM-dd"],
      synonyms: ["date of birth", "dob", "birthday", "birth date"],
    },
    {
      frontendLabel: "Anniversary",
      supabaseColumn: "anniversary",
      type: "date",
      required: false,
      dateFormats: ["dd/MM/yyyy", "MM-dd-yyyy", "yyyy-MM-dd"],
      synonyms: ["anniversary", "marriage anniversary", "anniversary date"],
    },
    {
      frontendLabel: "Purchase Status",
      supabaseColumn: "purchaseStatus",
      type: "enum",
      required: false,
      enumValues: PURCHASE_STATUS_VALUES,
      enumLabels: PURCHASE_STATUS_LABELS,
      synonyms: ["purchase status", "purchased", "bought", "conversion", "sale status", "status"],
    },
    {
      frontendLabel: "Products Explored",
      supabaseColumn: "productsExplored",
      type: "list",
      required: false,
      enumValues: PRODUCT_CATEGORY_VALUES,
      enumLabels: PRODUCT_CATEGORY_LABELS,
      synonyms: [
        "product",
        "service",
        "products explored",
        "product explored",
        "items explored",
        "category",
        "sku",
        "article",
        "collection",
      ],
    },
    {
      frontendLabel: "Products Purchased",
      supabaseColumn: "productsPurchased",
      type: "list",
      required: false,
      enumValues: PRODUCT_CATEGORY_VALUES,
      enumLabels: PRODUCT_CATEGORY_LABELS,
      synonyms: [
        "products purchased",
        "purchased products",
        "items purchased",
        "bought products",
        "purchase items",
      ],
    },
    {
      frontendLabel: "Revenue",
      supabaseColumn: "transactionAmount",
      type: "number",
      required: false,
      synonyms: [
        "amount",
        "amt",
        "purchase",
        "sale",
        "total",
        "value",
        "bill amt",
        "revenue",
        "transaction amount",
        "purchase amount",
      ],
    },
    {
      frontendLabel: "Intent Tier",
      supabaseColumn: "intentTier",
      type: "enum",
      required: false,
      enumValues: INTENT_TIER_VALUES,
      enumLabels: INTENT_TIER_LABELS,
      synonyms: ["intent tier", "interest level", "intent", "lead temperature", "hot warm cold"],
    },
    {
      frontendLabel: "Reason No Purchase",
      supabaseColumn: "reasonNoPurchase",
      type: "enum",
      required: false,
      enumValues: NO_PURCHASE_REASON_VALUES,
      enumLabels: NO_PURCHASE_REASON_LABELS,
      synonyms: ["reason no purchase", "no purchase reason", "why not purchased", "objection"],
    },
    {
      frontendLabel: "Competitor Mention",
      supabaseColumn: "competitorMention",
      type: "string",
      required: false,
      synonyms: ["competitor mention", "competitor", "competition", "other jeweller"],
    },
    {
      frontendLabel: "Purchase Occasion",
      supabaseColumn: "purchaseOccasion",
      type: "enum",
      required: false,
      enumValues: PURCHASE_OCCASION_VALUES,
      enumLabels: PURCHASE_OCCASION_LABELS,
      synonyms: ["purchase occasion", "occasion", "event", "reason for purchase"],
    },
    {
      frontendLabel: "Metal / KT Preference",
      supabaseColumn: "metalKtPref",
      type: "enum",
      required: false,
      enumValues: METAL_KT_VALUES,
      enumLabels: METAL_KT_LABELS,
      synonyms: ["metal preference", "kt preference", "metal kt", "gold kt", "karat"],
    },
    {
      frontendLabel: "Budget Stated",
      supabaseColumn: "budgetStated",
      type: "enum",
      required: false,
      enumValues: BUDGET_RANGE_VALUES,
      enumLabels: BUDGET_RANGE_LABELS,
      synonyms: ["budget stated", "budget", "budget range", "stated budget"],
    },
    {
      frontendLabel: "Schemes Pitched",
      supabaseColumn: "schemesPitched",
      type: "list",
      required: false,
      enumValues: SCHEME_PRODUCT_VALUES,
      enumLabels: SCHEME_PRODUCT_LABELS,
      synonyms: ["schemes pitched", "scheme pitched", "ghs", "jpp", "gpp"],
    },
    {
      frontendLabel: "Enrollment Outcome",
      supabaseColumn: "enrollmentOutcome",
      type: "enum",
      required: false,
      enumValues: ENROLLMENT_OUTCOME_VALUES,
      enumLabels: ENROLLMENT_OUTCOME_LABELS,
      synonyms: ["enrollment outcome", "scheme outcome", "enrolled", "scheme result"],
    },
    {
      frontendLabel: "Monthly Commitment",
      supabaseColumn: "monthlyCommitment",
      type: "number",
      required: false,
      synonyms: ["monthly commitment", "commitment amount", "monthly amount", "emi"],
    },
    {
      frontendLabel: "Reason No Enrollment",
      supabaseColumn: "reasonNoEnrollment",
      type: "enum",
      required: false,
      enumValues: DECLINE_REASON_VALUES,
      enumLabels: DECLINE_REASON_LABELS,
      synonyms: ["reason no enrollment", "decline reason", "why not enrolled"],
    },
    {
      frontendLabel: "Scheme Competitor Mention",
      supabaseColumn: "schemeCompetitorMention",
      type: "string",
      required: false,
      synonyms: ["scheme competitor", "competitor scheme", "alternative scheme"],
    },
    {
      frontendLabel: "Scheme Enrolled",
      supabaseColumn: "schemeEnrolled",
      type: "boolean",
      required: false,
      synonyms: ["scheme enrolled", "enrolled in scheme"],
    },
    {
      frontendLabel: "GHS Policy",
      supabaseColumn: "ghsPolicy",
      type: "boolean",
      required: false,
      synonyms: ["ghs policy", "ghs enrolled", "gold harvest scheme"],
    },
    {
      frontendLabel: "Follow-up Needed",
      supabaseColumn: "followUpNeeded",
      type: "boolean",
      required: false,
      synonyms: ["follow up needed", "follow-up needed", "needs follow up", "callback needed"],
    },
    {
      frontendLabel: "Follow-up Date",
      supabaseColumn: "followUpDate",
      type: "date",
      required: false,
      dateFormats: ["dd/MM/yyyy", "MM-dd-yyyy", "yyyy-MM-dd"],
      synonyms: ["follow up date", "follow-up date", "next follow up", "callback date"],
    },
    {
      frontendLabel: "Staff Notes",
      supabaseColumn: "staffNotes",
      type: "string",
      required: false,
      synonyms: ["notes", "note", "remarks", "comments", "staff notes", "observations"],
    },
  ],
};
