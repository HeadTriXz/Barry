import {
    type APIActionRowComponent,
    type APIButtonComponentWithCustomId,
    ButtonStyle,
    ComponentType
} from "@discordjs/core";

/**
 * Regular expression to match Discord invite links.
 */
export const INVITE_REGEX = /(?:discord\.(?:gg|io|me|plus)|discord(?:app)?\.com\/invite|invite\.(?:gg|ink))\/[\w-]{2,}/i;

/**
 * An array of components for the retry prompts.
 */
export const retryComponents: Array<APIActionRowComponent<APIButtonComponentWithCustomId>> = [{
    components: [
        {
            custom_id: "retry",
            label: "Retry",
            style: ButtonStyle.Success,
            type: ComponentType.Button
        },
        {
            custom_id: "continue",
            label: "Continue",
            style: ButtonStyle.Secondary,
            type: ComponentType.Button
        }
    ],
    type: ComponentType.ActionRow
}];
