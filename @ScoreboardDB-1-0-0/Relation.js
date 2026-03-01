import { ScoreboardStorage } from "./ScoreboardStorage.js";

/**
 * Relation Management Utility
 * * Handles "Foreign Key" relationships between different data objectives.
 * Allows you to define links between databases and automatically "populate" (hydrate)
 * raw data with the actual linked objects directly from the scoreboard.
 */
export class Relation {
    /**
     * Stores all the relationship definitions in RAM.
     * Structure: Map<SourceObjective, Array<BindingConfig>>
     * @type {Map<string, Array<object>>}
     */
    static _bindings = new Map();

    /* =========================
       DEFINITION
    ========================= */

    /**
     * Defines a relationship between two databases.
     * @param {string} sourceObjective - The objective containing the foreign key (e.g., "players").
     * @param {string} localField - The attribute holding the ID(s) (e.g., "guildId").
     * @param {string} targetObjective - The objective where the linked data lives (e.g., "guilds").
     * @param {string} targetField - The attribute in the target matching the ID (e.g., "uuid").
     * @param {string} as - The new field name where the populated object will be injected (e.g., "guildData").
     * @throws {TypeError} If parameters are invalid.
     */
    static bind(sourceObjective, localField, targetObjective, targetField, as) {
        if (!sourceObjective || !localField || !targetObjective || !targetField || !as) {
            throw new TypeError("[Relation] All binding parameters must be valid non-empty strings.");
        }

        if (!this._bindings.has(sourceObjective)) {
            this._bindings.set(sourceObjective, []);
        }

        this._bindings.get(sourceObjective).push({
            localField,
            targetObjective,
            targetField,
            as
        });
    }

    /* =========================
       HYDRATION (POPULATE)
    ========================= */

    /**
     * Populates a raw object (or array of objects) with its linked relational data.
     * Extracts linked data directly from the ScoreboardStorage.
     * @param {string} objectiveName - The name of the source objective (e.g., "players").
     * @param {object|Array<object>} rawData - The raw data object(s) to populate.
     * @param {string|Array<string>} [relationsToPopulate] - Optional. The specific relation name(s) (the 'as' field) to populate. If omitted, populates all.
     * @returns {object|Array<object>} A cloned object containing the hydrated data.
     */
    static populate(objectiveName, rawData, relationsToPopulate = null) {
        if (!rawData) return null;

        let bindings = this._bindings.get(objectiveName);
        
        if (!bindings || bindings.length === 0) {
            return rawData;
        }

        // --- OPTIMIZATION: Filter bindings if specific relations are requested ---
        if (relationsToPopulate) {
            // Convert to array if a single string was provided
            const requestedRelations = Array.isArray(relationsToPopulate) 
                ? relationsToPopulate 
                : [relationsToPopulate];
            
            // Keep only the bindings that match the requested 'as' names
            bindings = bindings.filter(binding => requestedRelations.includes(binding.as));
        }

        /**
         * Internal helper to process a single object
         * @param {object} obj 
         */
        const processSingle = (obj) => {
            const result = { ...obj };

            for (const binding of bindings) {
                const localValue = result[binding.localField];

                if (localValue === undefined || localValue === null) continue;

                // Fetch ALL records from the target database via ScoreboardStorage
                const targetRecords = ScoreboardStorage.getElements(binding.targetObjective);

                if (Array.isArray(localValue)) {
                    // --- 1 to MANY RELATION (Array of IDs) ---
                    result[binding.as] = localValue.map(idToFind => {
                        const match = targetRecords.find(record => record.data[binding.targetField] === idToFind);
                        return match ? match.data : null;
                    }).filter(item => item !== null);

                } else {
                    // --- 1 to 1 / MANY to 1 RELATION (Single ID) ---
                    const match = targetRecords.find(record => record.data[binding.targetField] === localValue);
                    result[binding.as] = match ? match.data : null;
                }
            }

            return result;
        };

        if (Array.isArray(rawData)) {
            return rawData.map(processSingle);
        }
        
        return processSingle(rawData);
    }

    /* =========================
       CLEANUP
    ========================= */

    /**
     * Clears all relationship bindings from memory.
     * Useful during server reloads.
     */
    static reset() {
        this._bindings.clear();
    }
}
