import {
    type Case,
    type CaseNote,
    CaseType
} from "@prisma/client";

const caseID = 34;
const creatorID = "257522665441460225";
const guildID = "68239102456844360";
const userID = "257522665437265920";

export const mockCaseNote: CaseNote = {
    caseID: caseID,
    content: "Rude!",
    createdAt: new Date("01-01-2023"),
    creatorID: creatorID,
    guildID: guildID,
    id: 1
};

export const mockCase: Case = {
    createdAt: new Date("01-01-2023"),
    creatorID: creatorID,
    guildID: guildID,
    id: caseID,
    type: CaseType.Note,
    userID: userID
};
