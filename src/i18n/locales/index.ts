import frCommon from "./fr/common.json";
import frHome from "./fr/home.json";
import frOnboarding from "./fr/onboarding.json";
import frProfile from "./fr/profile.json";
import frCalendar from "./fr/calendar.json";
import frCommunity from "./fr/community.json";

import enCommon from "./en/common.json";
import enHome from "./en/home.json";
import enOnboarding from "./en/onboarding.json";
import enProfile from "./en/profile.json";
import enCalendar from "./en/calendar.json";
import enCommunity from "./en/community.json";

export const defaultNS = "common";

export const resources = {
  fr: {
    common: frCommon,
    home: frHome,
    onboarding: frOnboarding,
    profile: frProfile,
    calendar: frCalendar,
    community: frCommunity,
  },
  en: {
    common: enCommon,
    home: enHome,
    onboarding: enOnboarding,
    profile: enProfile,
    calendar: enCalendar,
    community: enCommunity,
  },
} as const;

export type AppResources = (typeof resources)["fr"];
