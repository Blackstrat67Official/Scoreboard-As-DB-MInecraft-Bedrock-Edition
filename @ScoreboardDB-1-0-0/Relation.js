import { ScoreboardStorage } from "./ScoreboardStorage.js";

/**
 * Relation Management Utility
 * * Handles "Foreign Key" relationships between different data objectives.
 * Supports Direct relations (1:1, N:1, N:N) and Reverse relations (1:N) to hydrate
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
     * Defines a DIRECT relationship (1:1, N:1, N:N).
     * The source object contains the Foreign Key (or array of Keys).
     * @param {string} sourceObjective - The objective containing the foreign key(s) (e.g., "players").
     * @param {string} localField - The attribute holding the ID(s) (e.g., "guildId").
     * @param {string} targetObjective - The objective where the linked data lives (e.g., "guilds").
     * @param {string} targetField - The attribute in the target matching the ID (e.g., "uuid").
     * @param {string} as - The new field name where the populated object will be injected (e.g., "guildData").
     */
    static bind(sourceObjective, localField, targetObjective, targetField, as) {
        this._addBinding(sourceObjective, localField, targetObjective, targetField, as, false);
    }

    /**
     * Defines a REVERSE relationship (1:N).
     * The target objects contain the Foreign Key that points back to the source object.
     * Ideal for getting all members of a guild without storing an array of IDs in the guild.
     * @param {string} sourceObjective - The objective acting as the parent (e.g., "guilds").
     * @param {string} localField - The parent's ID attribute (e.g., "uuid").
     * @param {string} targetObjective - The objective containing the children (e.g., "players").
     * @param {string} targetField - The child's attribute pointing to the parent (e.g., "guildId").
     * @param {string} as - The new field name where the populated array will be injected (e.g., "memberData").
     */
    static bindReverse(sourceObjective, localField, targetObjective, targetField, as) {
        this._addBinding(sourceObjective, localField, targetObjective, targetField, as, true);
    }

    /**
     * Internal helper to register a binding.
     * @private
     */
    static _addBinding(sourceObjective, localField, targetObjective, targetField, as, isReverse) {
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
            as,
            isReverse
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
            const requestedRelations = Array.isArray(relationsToPopulate) 
                ? relationsToPopulate 
                : [relationsToPopulate];
            
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

                // If localValue is missing, set defaults and skip search
                if (localValue === undefined || localValue === null) {
                    result[binding.as] = binding.isReverse ? [] : null;
                    continue;
                }

                // Fetch ALL records from the target database via ScoreboardStorage
                const targetRecords = ScoreboardStorage.getElements(binding.targetObjective);

                if (binding.isReverse) {
                    // ==========================================
                    // REVERSE RELATION (1 to N)
                    // The parent searches for its children
                    // ==========================================
                    result[binding.as] = targetRecords
                        .filter(record => {
                            const targetVal = record.data[binding.targetField];
                            // Handle if the child's target field is an array (Reverse N:N)
                            if (Array.isArray(targetVal)) {
                                return targetVal.includes(localValue);
                            }
                            return targetVal === localValue;
                        })
                        .map(record => record.data);

                } else {
                    // ==========================================
                    // DIRECT RELATION (1:1, N:1, N:N)
                    // The child looks for its parent(s)
                    // ==========================================
                    if (Array.isArray(localValue)) {
                        // Array of IDs (N to N)
                        result[binding.as] = localValue.map(idToFind => {
                            const match = targetRecords.find(record => record.data[binding.targetField] === idToFind);
                            return match ? match.data : null;
                        }).filter(item => item !== null);

                    } else {
                        // Single ID (N to 1 / 1 to 1)
                        const match = targetRecords.find(record => record.data[binding.targetField] === localValue);
                        result[binding.as] = match ? match.data : null;
                    }
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
