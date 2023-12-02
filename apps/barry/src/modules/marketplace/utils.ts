import type { ReplyableInteraction } from "@barry-bot/core";
import {
    type APIEmbed,
    ButtonStyle,
    ComponentType,
    MessageFlags
} from "@discordjs/core";
import config from "../../config.js";

/**
 * Represents a user that can be contacted.
 */
interface Contactable {
    /**
     * The preferred contact method of the user.
     */
    contact: string | null;

    /**
     * The ID of the user.
     */
    userID: string;
}

/**
 * Capitalizes the first letter of each sentence in a string.
 *
 * @param value The input string to be capitalized.
 * @returns The input string with each sentence's first letter capitalized.
 */
export function capitalizeEachSentence(value: string): string {
    const sentences = value.trim().split(/(?<=[.!?])\s+/);
    const capitalizedSentences = sentences.map((sentence) => {
        return sentence.charAt(0).toUpperCase() + sentence.slice(1);
    });

    return capitalizedSentences.join(" ");
}

/**
 * Capitalizes the first letter of each word in a string.
 *
 * @param value The input string to be capitalized.
 * @returns The input string with each word's first letter capitalized.
 */
export function capitalizeEachWord(value: string): string {
    const words = value.trim().split(/\s+/);
    const capitalizedWords = words.map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    });

    return capitalizedWords.join(" ");
}

/**
* Displays the contact information of a user.
*
* @param interaction The interaction to reply to.
* @param contactable The user to display the contact information of.
*/
export async function displayContact(interaction: ReplyableInteraction, contactable: Contactable): Promise<void> {
   if (contactable.contact === null) {
       return interaction.createMessage({
           components: [{
               components: [{
                   label: "Send a DM",
                   style: ButtonStyle.Link,
                   type: ComponentType.Button,
                   url: `https://discord.com/users/${contactable.userID}`
               }],
               type: ComponentType.ActionRow
           }],
           content: `<@${contactable.userID}> hasn't provided any contact information. You can reach out to them by sending a direct message.`,
           flags: MessageFlags.Ephemeral
       });
   }

   await interaction.createMessage({
       components: [{
           components: [{
               label: "Send a DM",
               style: ButtonStyle.Link,
               type: ComponentType.Button,
               url: `https://discord.com/users/${contactable.userID}`
           }],
           type: ComponentType.ActionRow
       }],
       content: `<@${contactable.userID}> prefers to be contacted using the following information:\n\`\`\`\n${contactable.contact}\`\`\``,
       flags: MessageFlags.Ephemeral
   });
}

/**
 * Returns the DWC embed for the user.
 *
 * @param reason The reason the user has been marked as DWC.
 */
export function getDWCEmbed(reason: string): APIEmbed {
    return {
        author: {
            name: "Deal With Caution",
            icon_url: config.emotes.error.imageURL
        },
        description: "This user has been marked as `Deal With Caution`. If you have a business relationship with this person, proceed with caution.\n\n**Reason:**\n" + reason,
        color: config.embedColor
    };
}
