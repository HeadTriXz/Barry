import type { Profile } from "@prisma/client";
import { ProfileAvailability } from "../../../../../src/modules/marketplace/dependencies/profiles/editor/availability.js";
import { mockUser } from "@barry-bot/testing";

export const mockProfile: Profile = {
    about: "Hello world!",
    availability: ProfileAvailability.FullTime | ProfileAvailability.RemoteWork,
    bannerURL: "https://example.com/banner.png",
    contact: "Send me a direct message",
    creationStatus: null,
    links: ["https://example.com/", "https://github.com/HeadTriXz"],
    location: "San Francisco, CA",
    pricing: "Starting from $100",
    userID: mockUser.id,
    skills: ["Logo Design", "Icon Design", "Poster Design"]
};
