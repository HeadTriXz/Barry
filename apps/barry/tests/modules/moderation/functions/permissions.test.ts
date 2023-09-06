import type { APIGuild, APIRole } from "@discordjs/core";
import { getHighestRole, isAboveMember } from "../../../../src/modules/moderation/functions/permissions.js";
import { mockGuild, mockMember } from "@barry/testing";

describe("Permissions", () => {
    let guild: APIGuild;

    beforeEach(() => {
        guild = {
            ...mockGuild, roles: [
                { id: "1", position: 1 } as APIRole,
                { id: "2", position: 2 } as APIRole,
                { id: "3", position: 3 } as APIRole
            ]
        };
    });

    describe("getHighestRole", () => {
        it("should return the highest role of a member", () => {
            const member = { ...mockMember, roles: ["1", "2", "3"] };

            const role = getHighestRole(guild, member);

            expect(role).toEqual(guild.roles[2]);
        });

        it("should return undefined if the member has no roles", () => {
            const role = getHighestRole(mockGuild, mockMember);

            expect(role).toBeUndefined();
        });
    });

    describe("isAboveMember", () => {
        it("should return true if the first member is the guild owner", () => {
            const memberA = {
                ...mockMember,
                user: {
                    ...mockMember.user,
                    id: mockGuild.owner_id
                }
            };

            const result = isAboveMember(mockGuild, memberA, mockMember);

            expect(result).toBe(true);
        });

        it("should return false if the second member is the guild owner", () => {
            const memberA = {
                ...mockMember,
                user: {
                    ...mockMember.user,
                    id: "257522665437265920"
                }
            };
            const memberB = {
                ...mockMember,
                user: {
                    ...mockMember.user,
                    id: mockGuild.owner_id
                }
            };

            const result = isAboveMember(mockGuild, memberA, memberB);

            expect(result).toBe(false);
        });

        it("should return true if the first member has a higher role than the second member", () => {
            const memberA = {
                ...mockMember,
                roles: ["1", "2", "3"],
                user: {
                    ...mockMember.user,
                    id: "257522665437265920"
                }
            };
            const memberB = {
                ...mockMember,
                roles: ["1", "2"],
                user: {
                    ...mockMember.user,
                    id: "257522665458237440"
                }
            };

            const result = isAboveMember(guild, memberA, memberB);

            expect(result).toBe(true);
        });

        it("should return false if the first member has a lower role than the second member", () => {
            const memberA = {
                ...mockMember,
                roles: ["1", "2"],
                user: {
                    ...mockMember.user,
                    id: "257522665437265920"
                }
            };
            const memberB = {
                ...mockMember,
                roles: ["1", "2", "3"],
                user: {
                    ...mockMember.user,
                    id: "257522665458237440"
                }
            };

            const result = isAboveMember(guild, memberA, memberB);

            expect(result).toBe(false);
        });

        it("should return false if the first member has no roles", () => {
            const memberA = {
                ...mockMember,
                roles: [],
                user: {
                    ...mockMember.user,
                    id: "257522665437265920"
                }
            };
            const memberB = {
                ...mockMember,
                roles: ["1", "2", "3"],
                user: {
                    ...mockMember.user,
                    id: "257522665458237440"
                }
            };

            const result = isAboveMember(guild, memberA, memberB);

            expect(result).toBe(false);
        });

        it("should return true if the second member has no roles", () => {
            const memberA = {
                ...mockMember,
                roles: ["1", "2", "3"],
                user: {
                    ...mockMember.user,
                    id: "257522665437265920"
                }
            };
            const memberB = {
                ...mockMember,
                roles: [],
                user: {
                    ...mockMember.user,
                    id: "257522665458237440"
                }
            };

            const result = isAboveMember(guild, memberA, memberB);

            expect(result).toBe(true);
        });
    });
});
