import { world } from "@minecraft/server";

/**
 * Scoreboard JSON Storage Utility
 *
 * Objective      -> Logical database
 * Participant    -> JSON string (serialized object)
 * Score          -> Unique ID (memory address / pointer)
 *
 * This system allows persistent structured data storage
 * using Minecraft Bedrock scoreboards.
 */

export class ScoreboardStorage {

    /* =========================
       INTERNAL UTILITIES
    ========================= */

    /**
     * Get or create a scoreboard objective.
     * @param {string} objectiveName - The name of the objective.
     * @returns {import("@minecraft/server").ScoreboardObjective}
     * @throws {TypeError} If the objective name is invalid.
     * @throws {RangeError} If the objective name exceeds 16 characters.
     * @throws {Error} If the creation fails internally.
     */
    static _getObjective(objectiveName) {
        if (typeof objectiveName !== "string" || objectiveName.trim() === "") {
            throw new TypeError(`[ScoreboardStorage] Invalid objective name: '${objectiveName}'. Must be a non-empty string.`);
        }
        if (objectiveName.length > 16) {
            throw new RangeError(`[ScoreboardStorage] Objective name '${objectiveName}' exceeds Minecraft's 16-character limit.`);
        }

        let objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) {
            try {
                objective = world.scoreboard.addObjective(objectiveName, objectiveName);
            } catch (err) {
                throw new Error(`[ScoreboardStorage] Failed to create objective '${objectiveName}'. ${err.message}`);
            }
        }
        return objective;
    }

    /**
     * Generate the next available unique ID.
     * @param {import("@minecraft/server").ScoreboardObjective} objective
     * @returns {number} The next available integer ID.
     */
    static _getNextId(objective) {
        let max = 0;
        for (const p of objective.getParticipants()) {
            const score = objective.getScore(p);
            if (score > max) max = score;
        }
        return max + 1;
    }

    /**
     * Serialize an object into JSON string with limit checks.
     * @param {any} data - The data to serialize.
     * @returns {string} The JSON string.
     * @throws {TypeError} If the data is undefined.
     * @throws {RangeError} If the string exceeds Minecraft's 32,767 character limit.
     */
    static _stringify(data) {
        if (data === undefined) {
            throw new TypeError("[ScoreboardStorage] Cannot save 'undefined' data.");
        }
        
        const json = JSON.stringify(data);
        
        // 32767 è il limite fisico di lunghezza di un partecipante scoreboard in Bedrock
        if (json.length > 32767) {
            throw new RangeError(`[ScoreboardStorage] Data size (${json.length} chars) exceeds Minecraft's maximum limit of 32,767 characters. Consider splitting the data.`);
        }
        
        return json;
    }

    /**
     * Safely parse a JSON string.
     * @param {string} json - The JSON string to parse.
     * @returns {any|null} The parsed object, or null if parsing fails.
     */
    static _parse(json) {
        try {
            return JSON.parse(json);
        } catch {
            return null; // Ignora stringhe non-JSON salvate magari da altri addon
        }
    }

    /* =========================
       WRITE
    ========================= */

    /**
     * Save a JSON object into the scoreboard.
     * @param {string} objectiveName - The name of the objective.
     * @param {object} data - The data to save.
     * @returns {number} The unique ID (memory address) assigned to the record.
     */
    static save(objectiveName, data) {
        const objective = this._getObjective(objectiveName);
        const json = this._stringify(data); // Stringify validerà anche la lunghezza
        const id = this._getNextId(objective);

        objective.setScore(json, id);
        return id;
    }

    /* =========================
       READ
    ========================= */

    /**
     * Retrieve a JSON object by its ID.
     * @param {string} objectiveName - The name of the objective.
     * @param {number} id - The unique ID of the record.
     * @returns {object|null} The parsed data, or null if not found.
     * @throws {TypeError} If the ID is not a valid number.
     */
    static getElementById(objectiveName, id) {
        if (typeof id !== "number" || isNaN(id)) {
            throw new TypeError(`[ScoreboardStorage] ID must be a valid number, got ${typeof id}.`);
        }

        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return null;

        for (const p of objective.getParticipants()) {
            if (objective.getScore(p) === id) {
                return this._parse(p.displayName);
            }
        }
        return null;
    }

    /**
     * Retrieve stored JSON objects, optionally filtering by conditions.
     * - If 'query' is omitted: returns all records.
     * - If 'query' is an object: returns records matching exact attributes.
     * - If 'query' is a function: returns records where the callback returns true.
     * @param {string} objectiveName - The name of the objective.
     * @param {object|function} [query] - Optional. Example: { role: "admin" } OR (data) => data.level > 10.
     * @returns {Array<{id: number, data: any}>} Array of matched objects.
     * @throws {TypeError} If the query is invalid.
     */
    static getElements(objectiveName, query) {
        if (query !== undefined && typeof query !== "object" && typeof query !== "function") {
            throw new TypeError("[ScoreboardStorage] Query must be an object, a function, or undefined.");
        }

        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return [];

        const result = [];
        const isFunction = typeof query === "function";
        const isObject = typeof query === "object" && query !== null;

        for (const p of objective.getParticipants()) {
            const parsed = this._parse(p.displayName);
            if (parsed !== null) {
                let match = true;

                if (query !== undefined) {
                    if (isFunction) {
                        match = query(parsed);
                    } else if (isObject) {
                        for (const key in query) {
                            if (parsed[key] !== query[key]) {
                                match = false;
                                break;
                            }
                        }
                    }
                }

                if (match) {
                    result.push({
                        id: objective.getScore(p),
                        data: parsed
                    });
                }
            }
        }
        return result;
    }

    /**
     * Find the first JSON object using a callback condition.
     * @param {string} objectiveName - The name of the objective.
     * @param {function} callback - Function that evaluates each parsed object: (data) => boolean.
     * @returns {{id: number, data: any}|null} The first matched object, or null if not found.
     * @throws {TypeError} If the callback is not a function.
     */
    static find(objectiveName, callback) {
        if (typeof callback !== "function") {
            throw new TypeError("[ScoreboardStorage] Callback must be a function.");
        }

        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return null;

        for (const p of objective.getParticipants()) {
            const parsed = this._parse(p.displayName);
            if (parsed && callback(parsed)) {
                return {
                    id: objective.getScore(p),
                    data: parsed
                };
            }
        }
        return null;
    }

    /**
     * Find ALL JSON objects using a callback condition.
     * @param {string} objectiveName - The name of the objective.
     * @param {function} callback - Function that evaluates each parsed object: (data) => boolean.
     * @returns {Array<{id: number, data: any}>} Array of matched objects.
     * @throws {TypeError} If the callback is not a function.
     */
    static findAll(objectiveName, callback) {
        if (typeof callback !== "function") {
            throw new TypeError("[ScoreboardStorage] Callback must be a function.");
        }

        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return [];

        const results = [];
        for (const p of objective.getParticipants()) {
            const parsed = this._parse(p.displayName);
            if (parsed && callback(parsed)) {
                results.push({
                    id: objective.getScore(p),
                    data: parsed
                });
            }
        }
        return results;
    }

    /* =========================
       UPDATE
    ========================= */

    /**
     * Update a JSON object while keeping the same ID.
     * @param {string} objectiveName - The name of the objective.
     * @param {number} id - The ID of the record to update.
     * @param {object} newData - The new data to save.
     * @returns {boolean} True if updated, false if the ID was not found.
     * @throws {TypeError} If the ID is invalid or newData is undefined.
     */
    static updateById(objectiveName, id, newData) {
        if (typeof id !== "number" || isNaN(id)) {
            throw new TypeError(`[ScoreboardStorage] ID must be a valid number, got ${typeof id}.`);
        }
        if (newData === undefined) {
            throw new TypeError("[ScoreboardStorage] newData must be provided to perform an update.");
        }

        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return false;

        const newJsonStr = this._stringify(newData);

        for (const p of objective.getParticipants()) {
            if (objective.getScore(p) === id) {
                objective.removeParticipant(p);
                objective.setScore(newJsonStr, id);
                return true;
            }
        }
        return false;
    }

    /**
     * Update JSON objects based on conditions (Partial update / Merge).
     * - If 'query' is an object: finds records matching exact attributes.
     * - If 'query' is a function: finds records where the callback returns true.
     * @param {string} objectiveName - The name of the objective.
     * @param {object|function} query - Example: { uuid: "xxxxx" } OR (data) => data.level < 10.
     * @param {object|function} newData - The properties to update, OR a callback (oldData) => newData.
     * @returns {number} The amount of records successfully updated.
     * @throws {TypeError} If query or newData are not provided/invalid.
     */
    static update(objectiveName, query, newData) {
        if (query === undefined) {
            throw new TypeError("[ScoreboardStorage] Query must be provided for mass update.");
        }
        if (newData === undefined) {
            throw new TypeError("[ScoreboardStorage] newData must be provided for update.");
        }

        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return 0;

        let updatedCount = 0;
        const isQueryFunction = typeof query === "function";
        const isQueryObject = typeof query === "object" && query !== null;
        const isNewDataFunction = typeof newData === "function";

        for (const p of objective.getParticipants()) {
            const parsed = this._parse(p.displayName);
            if (parsed !== null) {
                let match = false;

                if (isQueryFunction) {
                    match = query(parsed);
                } else if (isQueryObject) {
                    match = true;
                    for (const key in query) {
                        if (parsed[key] !== query[key]) {
                            match = false;
                            break;
                        }
                    }
                }

                if (match) {
                    const id = objective.getScore(p);
                    objective.removeParticipant(p);
                    
                    let dataToSave;
                    if (isNewDataFunction) {
                        dataToSave = newData(parsed);
                    } else {
                        dataToSave = { ...parsed, ...newData };
                    }

                    objective.setScore(this._stringify(dataToSave), id);
                    updatedCount++;
                }
            }
        }
        return updatedCount;
    }

    /* =========================
       DELETE
    ========================= */

    /**
     * Delete a record by ID.
     * @param {string} objectiveName - The name of the objective.
     * @param {number} id - The ID of the record to delete.
     * @returns {boolean} True if deleted, false if not found.
     * @throws {TypeError} If the ID is not a valid number.
     */
    static deleteById(objectiveName, id) {
        if (typeof id !== "number" || isNaN(id)) {
            throw new TypeError(`[ScoreboardStorage] ID must be a valid number, got ${typeof id}.`);
        }

        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return false;

        for (const p of objective.getParticipants()) {
            if (objective.getScore(p) === id) {
                objective.removeParticipant(p);
                return true;
            }
        }
        return false;
    }

    /**
     * Delete records based on conditions (Massive delete).
     * - If 'query' is an object: deletes records matching exact attributes.
     * - If 'query' is a function: deletes records where the callback returns true.
     * @param {string} objectiveName - The name of the objective.
     * @param {object|function} query - Example: { faction: "Bandits" } OR (data) => data.level < 5.
     * @returns {number} The amount of records successfully deleted.
     * @throws {TypeError} If the query is invalid.
     */
    static delete(objectiveName, query) {
        if (query !== undefined && typeof query !== "object" && typeof query !== "function") {
            throw new TypeError("[ScoreboardStorage] Query must be an object, a function, or undefined.");
        }

        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return 0;

        let deletedCount = 0;
        const isQueryFunction = typeof query === "function";
        const isQueryObject = typeof query === "object" && query !== null;

        for (const p of objective.getParticipants()) {
            const parsed = this._parse(p.displayName);
            if (parsed !== null) {
                let match = false;

                if (isQueryFunction) {
                    match = query(parsed);
                } else if (isQueryObject) {
                    match = true;
                    for (const key in query) {
                        if (parsed[key] !== query[key]) {
                            match = false;
                            break;
                        }
                    }
                }

                if (match) {
                    objective.removeParticipant(p);
                    deletedCount++;
                }
            }
        }
        
        return deletedCount;
    }

    /* =========================
       UTILITIES
    ========================= */

    /**
     * Check if a record exists.
     * - If 'query' is omitted: returns true if the objective has AT LEAST one record.
     * - If 'query' is a number: checks the ID (fast, no parsing).
     * - If 'query' is an object: parses records to find a match.
     * @param {string} objectiveName - The name of the objective.
     * @param {number|object} [query] - Optional. Example: 5 OR { name: "StellaEXE" }.
     * @returns {boolean} True if at least one record matches.
     * @throws {TypeError} If the query is invalid.
     */
    static exists(objectiveName, query) {
        if (query !== undefined && typeof query !== "number" && typeof query !== "object") {
            throw new TypeError("[ScoreboardStorage] Query must be a number (ID), an object, or undefined.");
        }

        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return false;

        if (query === undefined) {
            return objective.getParticipants().length > 0;
        }

        const isId = typeof query === "number";

        for (const p of objective.getParticipants()) {
            if (isId) {
                if (objective.getScore(p) === query) return true;
                continue;
            }

            const parsed = this._parse(p.displayName);
            if (parsed) {
                let match = true;
                for (const key in query) {
                    if (parsed[key] !== query[key]) {
                        match = false;
                        break;
                    }
                }
                if (match) return true;
            }
        }
        return false;
    }

    /**
     * Count records in the database based on conditions.
     * - If 'query' is omitted: returns the total number of records (fast).
     * - If 'query' is an object: counts records that exactly match the attributes.
     * - If 'query' is a function: counts records where the callback returns true.
     * @param {string} objectiveName - The name of the objective.
     * @param {object|function} [query] - Optional. Example: { role: "admin" } OR (data) => data.level > 10.
     * @returns {number} The total count of matched records.
     * @throws {TypeError} If the query is invalid.
     */
    static count(objectiveName, query) {
        if (query !== undefined && typeof query !== "object" && typeof query !== "function") {
            throw new TypeError("[ScoreboardStorage] Query must be an object, a function, or undefined.");
        }

        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return 0;

        const participants = objective.getParticipants();

        if (query === undefined) {
            return participants.length;
        }

        let totalCount = 0;
        const isFunction = typeof query === "function";

        for (const p of participants) {
            const parsed = this._parse(p.displayName);
            if (!parsed) continue;

            if (isFunction) {
                if (query(parsed)) totalCount++;
            } 
            else if (typeof query === "object") {
                let match = true;
                for (const key in query) {
                    if (parsed[key] !== query[key]) {
                        match = false;
                        break;
                    }
                }
                if (match) totalCount++;
            }
        }

        return totalCount;
    }

    /**
     * Remove all participants from the objective.
     * @param {string} objectiveName - The name of the objective.
     * @throws {TypeError} If the objective name is invalid.
     */
    static clear(objectiveName) {
        if (typeof objectiveName !== "string" || objectiveName.trim() === "") {
            throw new TypeError("[ScoreboardStorage] Objective name must be a valid string.");
        }

        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return;

        for (const p of objective.getParticipants()) {
            objective.removeParticipant(p);
        }
    }
}
