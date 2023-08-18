import config from "../../../../../config.js";

/**
 * Represents the availability options for a profile.
 */
export enum ProfileAvailability {
    None = 0,
    FullTime = 1 << 0,
    PartTime = 1 << 1,
    Freelance = 1 << 2,
    RemoteWork = 1 << 3,
    FlexibleHours = 1 << 4,
    CurrentlyBusy = 1 << 5
}

/**
 * Descriptions for different profile availability combinations.
 */
export const combinations: Record<number, string> = {
    [ProfileAvailability.None]: "Not available",
    [ProfileAvailability.FullTime]: "Available for full-time positions",
    [ProfileAvailability.PartTime]: "Available for part-time positions",
    [ProfileAvailability.Freelance]: "Available for freelance gigs",
    [ProfileAvailability.RemoteWork]: "Available for remote work",
    [ProfileAvailability.FlexibleHours]: "Available with flexible hours",
    [ProfileAvailability.CurrentlyBusy]: "Currently busy, limited availability",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime]: "Available for full-time and part-time positions",
    [ProfileAvailability.FullTime | ProfileAvailability.Freelance]: "Available for full-time positions and freelance gigs",
    [ProfileAvailability.FullTime | ProfileAvailability.RemoteWork]: "Available for remote full-time positions",
    [ProfileAvailability.FullTime | ProfileAvailability.FlexibleHours]: "Available for full-time positions with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for full-time positions",
    [ProfileAvailability.PartTime | ProfileAvailability.Freelance]: "Available for part-time positions and freelance gigs",
    [ProfileAvailability.PartTime | ProfileAvailability.RemoteWork]: "Available for remote part-time positions",
    [ProfileAvailability.PartTime | ProfileAvailability.FlexibleHours]: "Available for part-time positions with flexible hours",
    [ProfileAvailability.PartTime | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for part-time positions",
    [ProfileAvailability.Freelance | ProfileAvailability.RemoteWork]: "Available for remote freelance gigs",
    [ProfileAvailability.Freelance | ProfileAvailability.FlexibleHours]: "Available for freelance gigs with flexible hours",
    [ProfileAvailability.Freelance | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for freelance gigs",
    [ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours]: "Available for remote work with flexible hours",
    [ProfileAvailability.RemoteWork | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote work",
    [ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.Freelance]: "Available for full-time, part-time positions, and freelance gigs",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.RemoteWork]: "Available for remote full-time, part-time positions",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.FlexibleHours]: "Available for full-time, part-time positions with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for full-time, part-time positions",
    [ProfileAvailability.FullTime | ProfileAvailability.Freelance | ProfileAvailability.RemoteWork]: "Available for remote full-time positions and freelance gigs",
    [ProfileAvailability.FullTime | ProfileAvailability.Freelance | ProfileAvailability.FlexibleHours]: "Available for full-time positions and freelance gigs with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.Freelance | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for full-time positions and freelance gigs",
    [ProfileAvailability.FullTime | ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours]: "Available for remote full-time positions with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.RemoteWork | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote full-time positions",
    [ProfileAvailability.FullTime | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for full-time positions with flexible hours",
    [ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.RemoteWork]: "Available for remote part-time positions and freelance gigs",
    [ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.FlexibleHours]: "Available for part-time positions and freelance gigs with flexible hours",
    [ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for part-time positions and freelance gigs",
    [ProfileAvailability.PartTime | ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours]: "Available for remote part-time positions with flexible hours",
    [ProfileAvailability.PartTime | ProfileAvailability.RemoteWork | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote part-time positions",
    [ProfileAvailability.PartTime | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for part-time positions with flexible hours",
    [ProfileAvailability.Freelance | ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours]: "Available for remote freelance gigs with flexible hours",
    [ProfileAvailability.Freelance | ProfileAvailability.RemoteWork | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote freelance gigs",
    [ProfileAvailability.Freelance | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for freelance gigs with flexible hours",
    [ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote work with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.RemoteWork]: "Available for remote full-time, part-time positions, and freelance gigs",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.FlexibleHours]: "Available for full-time, part-time positions, freelance gigs with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for full-time, part-time positions, and freelance gigs",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours]: "Available for remote full-time, part-time positions with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.RemoteWork | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote full-time, part-time positions",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for full-time, part-time positions with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.Freelance | ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours]: "Available for remote full-time positions, freelance gigs with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.Freelance | ProfileAvailability.RemoteWork | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote full-time positions and freelance gigs",
    [ProfileAvailability.FullTime | ProfileAvailability.Freelance | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for full-time positions and freelance gigs with flexible hours",
    [ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours]: "Available for remote part-time positions and freelance gigs with flexible hours",
    [ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.RemoteWork | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote part-time positions and freelance gigs",
    [ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for part-time positions and freelance gigs with flexible hours",
    [ProfileAvailability.PartTime | ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote part-time positions with flexible hours",
    [ProfileAvailability.Freelance | ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote freelance gigs with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours]: "Available for remote full-time, part-time positions, and freelance gigs with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.RemoteWork | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote full-time, part-time positions, and freelance gigs",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for full-time, part-time positions, and freelance gigs with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote full-time, part-time positions with flexible hours",
    [ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote part-time positions, and freelance gigs with flexible hours",
    [ProfileAvailability.FullTime | ProfileAvailability.PartTime | ProfileAvailability.Freelance | ProfileAvailability.RemoteWork | ProfileAvailability.FlexibleHours | ProfileAvailability.CurrentlyBusy]: "Currently busy but available for remote full-time, part-time positions, and freelance gigs with flexible hours"
};

/**
 * Returns the status emoji based on the provided bitflags.
 *
 * @param availability The availability bitflags.
 * @returns The emoji that belongs to the availability.
 */
export function getEmoji(availability: number): string {
    if (availability === 0) {
        return config.emotes.unavailable.toString();
    }

    if ((availability & ProfileAvailability.CurrentlyBusy) !== 0) {
        return config.emotes.busy.toString();
    }

    return config.emotes.available.toString();
}
