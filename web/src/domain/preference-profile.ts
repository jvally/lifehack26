export type PreferenceProfile = {
  id: "balanced" | "performance" | "value" | "sustainable";
  label: string;
  description: string;
  preferences: string[];
};

export const preferenceProfiles: PreferenceProfile[] = [
  {
    id: "balanced",
    label: "Balanced shopper",
    description: "Prioritises overall fit and trustworthy product facts.",
    preferences: [],
  },
  {
    id: "performance",
    label: "Performance-focused",
    description: "Prioritises light weight, technical fit, and use-case suitability.",
    preferences: ["lightweight", "performance", "technical fit"],
  },
  {
    id: "value",
    label: "Value-focused",
    description: "Prioritises price fit, durability, and versatile use.",
    preferences: ["value", "durable", "versatile"],
  },
  {
    id: "sustainable",
    label: "Sustainability-focused",
    description: "Prioritises verified material and sustainability claims.",
    preferences: ["sustainable", "recycled", "responsibly made"],
  },
];

export function getPreferenceProfile(id: string | null | undefined): PreferenceProfile {
  return preferenceProfiles.find((profile) => profile.id === id) ?? preferenceProfiles[0];
}
