/**
 * Represents a known platform.
 */
export interface KnownPlatform {
    /**
     * The name of the platform.
     */
    name: string;

    /**
     * The regex pattern to match the platform's URL.
     */
    pattern: RegExp;
}

/**
 * Represents a parsed link.
 */
export interface ParsedLink {
    /**
     * The name of the platform.
     */
    platform: string;

    /**
     * The username extracted from the link.
     */
    username: string;
}

/**
 * List of known platforms with their patterns.
 */
const PLATFORMS: KnownPlatform[] = [
    {
        name: "Behance",
        pattern: /^https?:\/\/(?:www\.)?behance\.net\/(\w+)\/?$/
    },
    {
        name: "Dribbble",
        pattern: /^https?:\/\/(?:www\.)?dribbble\.com\/(\w+)\/?$/
    },
    {
        name: "LinkedIn",
        pattern: /^https?:\/\/(?:www\.)?linkedin\.com\/(?:in\/)?(\w+)\/?$/
    },
    {
        name: "Twitter",
        pattern: /^https?:\/\/(?:www\.)?twitter\.com\/(\w+)\/?$/
    },
    {
        name: "Instagram",
        pattern: /^https?:\/\/(?:www\.)?instagram\.com\/(\w+)\/?$/
    },
    {
        name: "GitHub",
        pattern: /^https?:\/\/(?:www\.)?github\.com\/(\w+)\/?$/
    }
];

/**
 * Parses a link and extracts the platform and username.
 *
 * @param url The URL to be parsed.
 * @returns An object containing the platform and username, if found.
 */
export function parseLink(url: string): ParsedLink {
    for (const platform of PLATFORMS) {
        const match = url.match(platform.pattern);
        if (match !== null) {
            return {
                platform: platform.name,
                username: match[1]
            };
        }
    }

    const parsedURL = new URL(url);
    return {
        platform: "Website",
        username: parsedURL.hostname
    };
}
