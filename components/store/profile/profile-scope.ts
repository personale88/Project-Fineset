import type { Content } from "@/content/en";

export type ProfileScope =
  | "account"
  | "staff"
  | "activity"
  | "billing"
  | "preferences"
  | "support"
  | "signOut";

export type ProfileCopy =
  | Content["store"]["ownerShell"]["profile"]
  | Content["store"]["managerShell"]["profile"];

const PROFILE_SCOPES: ProfileScope[] = [
  "account",
  "staff",
  "billing",
  "preferences",
  "support",
  "activity",
  "signOut",
];

export function parseProfileSection(value: string | null | undefined): ProfileScope {
  if (value && PROFILE_SCOPES.includes(value as ProfileScope)) {
    return value as ProfileScope;
  }
  return "account";
}

export function profileScopeMeta(
  copy: ProfileCopy,
  scope: ProfileScope,
): { title: string; description: string } {
  switch (scope) {
    case "account":
      return {
        title: copy.account.title,
        description: copy.account.description,
      };
    case "staff":
      return { title: copy.staff.title, description: copy.staff.description };
    case "activity":
      return { title: copy.activity.title, description: copy.activity.description };
    case "billing":
      return { title: copy.billing.title, description: copy.billing.description };
    case "preferences":
      return { title: copy.preferences.title, description: copy.preferences.description };
    case "support":
      return { title: copy.support.title, description: copy.support.description };
    case "signOut":
      return { title: copy.signOut.title, description: copy.signOut.description };
  }
}
