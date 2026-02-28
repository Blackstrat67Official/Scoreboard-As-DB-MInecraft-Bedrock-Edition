import { ScoreboardStorage } from "./ScoreboardStorage";

/**
 * Data Schema Utility
 * * Provides a way to define blueprints for your data structures.
 * It automatically fills in missing fields with default values
 * or executes generator functions (e.g., for UUIDs or Timestamps)
 * before saving the data to the database.
 */
export class DataSchema {

    /**
     * Initializes the Schema Manager.
     * @param {string} scoreboardName - The objective name where schema metadata will be saved.
     * @throws {TypeError} If the scoreboard name is invalid or missing.
     */
    constructor(scoreboardName) {
        if (typeof scoreboardName !== "string" || scoreboardName.trim() === "") {
            throw new TypeError("[DataSchema] A valid scoreboard name must be provided in the constructor.");
        }

        /**
         * The scoreboard objective used to store schema metadata.
         * @type {string}
         */
        this.scoreboardName = scoreboardName;

        /**
         * RAM memory to store generator functions.
         * (Functions cannot be serialized into JSON, so they are kept in memory).
         * @type {Map<string, object>}
         */
        this.schemas = new Map();
    }

    /* =========================
       DEFINITION
    ========================= */

    /**
     * Registers a new data schema. This should be executed when the world starts.
     * @param {string} schemaName - The name of the schema (e.g., "PlayerSchema").
     * @param {object} schemaDefinition - The object defining default values or generator functions.
     * @throws {TypeError} If the parameters are invalid.
     */
    define(schemaName, schemaDefinition) {
        if (typeof schemaName !== "string" || schemaName.trim() === "") {
            throw new TypeError("[DataSchema] Schema name must be a valid string.");
        }
        if (typeof schemaDefinition !== "object" || schemaDefinition === null) {
            throw new TypeError("[DataSchema] Schema definition must be an object.");
        }

        // 1. Save the operational logic (including functions) in RAM
        this.schemas.set(schemaName, schemaDefinition);

        // 2. Save a textual representation in the dedicated scoreboard
        // We only extract the keys to prevent JSON.stringify from crashing due to functions
        const schemaMetadata = {
            name: schemaName,
            fields: Object.keys(schemaDefinition),
            registeredAt: Date.now()
        };
        
        // Check if a schema with this name already exists in the scoreboard to avoid duplicates
        const existing = ScoreboardStorage.exists(this.scoreboardName, { name: schemaName });
        if (!existing) {
            ScoreboardStorage.save(this.scoreboardName, schemaMetadata);
        }
    }

    /* =========================
       RESOLUTION (MERGE)
    ========================= */

    /**
     * Compares incoming data with the predefined schema.
     * Fills missing fields with default values or by executing generator functions.
     * @param {string} schemaName - The name of the schema to use.
     * @param {object} [inputData={}] - The partial data provided by the user.
     * @returns {object} The complete, formatted object ready to be saved.
     * @throws {Error} If the requested schema has not been defined.
     */
    resolve(schemaName, inputData = {}) {
        const schema = this.schemas.get(schemaName);
        
        if (!schema) {
            throw new Error(`[DataSchema] Schema '${schemaName}' not found. Make sure to register it using define() on startup.`);
        }

        // Create a clone of the input to avoid mutating the original object
        const resolvedData = { ...inputData };

        // Iterate over all expected keys from the schema
        for (const [key, defaultValue] of Object.entries(schema)) {
            
            // If the user did NOT provide this field, or passed undefined/null
            if (resolvedData[key] === undefined || resolvedData[key] === null) {
                
                // Check if the default value is a function (e.g., UUID Generator)
                if (typeof defaultValue === "function") {
                    resolvedData[key] = defaultValue(); // Execute the generator function
                } else {
                    // It's a static fallback value (e.g., defaultRank: 1)
                    resolvedData[key] = defaultValue;
                }
            }
        }

        return resolvedData;
    }

    /* =========================
       CLEANUP
    ========================= */

    /**
     * Completely resets the schemas in RAM and clears the dedicated scoreboard.
     * Use with caution as this is a destructive action.
     */
    reset() {
        // 1. Clear the RAM memory
        this.schemas.clear();
        
        // 2. Physically clear the schema scoreboard
        try {
            ScoreboardStorage.clear(this.scoreboardName);
        } catch (e) {
            // Ignore error if the scoreboard hasn't been created yet by the game
        }
    }
}
