/**
 * Data Format Utility
 * * Provides standardized data structures, generators, and validators
 * for the ScoreboardStorage system.
 */
export class DataFormat {

    /**
     * Generate a new UUID v4 or return the provided one.
     * Useful for giving unique string IDs to items or players.
     * @param {string} [existingUuid] - If provided, returns it. If null, generates a new one.
     * @returns {string}
     */
    static uuid(existingUuid = null) {
        if (existingUuid && typeof existingUuid === "string") return existingUuid;
        
        // Generatore pseudo-casuale per UUID v4 compatibile con l'engine JS di Bedrock
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Standardize a Timestamp (Epoch milliseconds).
     * @param {number|Date} [input] - Can be a Date object, an epoch number, or left empty for 'now'.
     * @returns {number}
     */
    static timestamp(input) {
        if (input instanceof Date) return input.getTime();
        if (typeof input === "number") return input;
        return Date.now(); // Default: momento attuale
    }

    /**
     * Standardize Minecraft coordinates into a clean Vector3 object.
     * You can pass an entity.location object directly, or x, y, z separately.
     * @param {number|object} x - The X coordinate, or an object containing {x, y, z}
     * @param {number} [y=0]
     * @param {number} [z=0]
     * @returns {{x: number, y: number, z: number}}
     */
    static vector3(x, y, z) {
        // Se passiamo direttamente un Vector3 di Minecraft (es. player.location)
        if (typeof x === 'object' && x !== null && 'x' in x) {
            // Arrotonda i decimali per risparmiare spazio nel JSON dello scoreboard
            return {
                x: Number(x.x.toFixed(2)),
                y: Number(x.y.toFixed(2)),
                z: Number(x.z.toFixed(2))
            };
        }
        
        // Se passiamo coordinate separate
        return {
            x: Number((x || 0).toFixed(2)),
            y: Number((y || 0).toFixed(2)),
            z: Number((z || 0).toFixed(2))
        };
    }

    /**
     * Ensure a number is within a specific range, with a default fallback.
     * Perfect for stats, money, or levels.
     * @param {any} value - The input to check
     * @param {number} fallback - Value to use if input is invalid
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @returns {number}
     */
    static clampNumber(value, fallback = 0, min = -Infinity, max = Infinity) {
        let num = Number(value);
        if (isNaN(num)) num = fallback;
        return Math.max(min, Math.min(max, num));
    }
}
