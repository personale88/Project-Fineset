import { callLogSchema } from "@/lib/import-engine/schema-configs/callLogSchema";
import { visitLogSchema } from "@/lib/import-engine/schema-configs/visitLogSchema";
import type { FeatureSchemaConfig } from "@/lib/import-engine/types";

export const SCHEMA_CONFIGS: Record<string, FeatureSchemaConfig> = {
  visit_log: visitLogSchema,
  call_log: callLogSchema,
};

export function getSchemaConfig(featureKey: string): FeatureSchemaConfig | null {
  return SCHEMA_CONFIGS[featureKey] ?? null;
}

export { visitLogSchema, callLogSchema };
