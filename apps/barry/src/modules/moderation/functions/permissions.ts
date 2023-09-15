import type {
    APIGuild,
    APIGuildMember,
    APIRole,
    APIUser
} from "@discordjs/core";

/**
 * A partial guild member.
 */
export interface PartialGuildMember extends Omit<APIGuildMember, "deaf" | "mute"> {
    user: APIUser;
}

/**
 * Returns the highest role of a member.
 *
 * @param guild The guild the member is in.
 * @param member The member to get the highest role of.
 * @returns The highest role of the member, if any.
 */
export function getHighestRole(guild: APIGuild, member: PartialGuildMember): APIRole | undefined {
    return member.roles
        .map((id) => guild.roles.find((role) => role.id === id))
        .filter((role) => role !== undefined)
        .sort((a, b) => b!.position - a!.position)[0];
}

/**
 * Returns whether a member is above another member.
 *
 * @param guild The guild the members are in.
 * @param a The first member.
 * @param b The second member.
 * @returns Whether the first member is above the second member.
 */
export function isAboveMember(guild: APIGuild, a: PartialGuildMember, b: PartialGuildMember): boolean {
    if (a.user.id === guild.owner_id) {
        return true;
    }

    if (b.user.id === guild.owner_id) {
        return false;
    }

    const highestA = getHighestRole(guild, a);
    const highestB = getHighestRole(guild, b);

    if (highestA === undefined) {
        return false;
    }

    if (highestB === undefined) {
        return true;
    }

    console.log(highestA.position, highestB.position);
    return highestA.position > highestB.position;
}
