import type { RequestWithAttachments } from "../../../../../src/modules/marketplace/dependencies/requests/database.js";
import { RequestStatus } from "@prisma/client";
import { mockUser } from "@barry/testing";

export const mockRequest: RequestWithAttachments = {
    attachments: [],
    compensation: "$100 / hour",
    contact: "Send me a direct message",
    createdAt: new Date("01-01-2023"),
    deadline: "ASAP",
    description: "Hello world!",
    id: 1,
    location: "Remote",
    status: RequestStatus.Available,
    title: "Foo Bar",
    updatedAt: new Date("01-01-2023"),
    userID: mockUser.id
};
