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
     * Get or create a scoreboard objective
     */
    static _getObjective(objectiveName) {
        let objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) {
            objective = world.scoreboard.addObjective(objectiveName, objectiveName);
        }
        return objective;
    }

    /**
     * Generate the next available unique ID
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
     * Serialize an object into JSON string
     */
    static _stringify(data) {
        return JSON.stringify(data);
    }

    /**
     * Safely parse a JSON string
     */
    static _parse(json) {
        try {
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    /* =========================
       WRITE
    ========================= */

    /**
     * Save a JSON object into the scoreboard
     * @returns {number} unique ID (memory address)
     */
    static save(objectiveName, data) {
        const objective = this._getObjective(objectiveName);
        const id = this._getNextId(objective);
        const json = this._stringify(data);

        objective.setScore(json, id);
        return id;
    }

    /* =========================
       READ
    ========================= */

    /**
     * Retrieve a JSON object by its ID
     */
    static getElementById(objectiveName, id) {
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
     * @param {string} objectiveName
     * @param {object|function} [query] - Optional. Example: { role: "admin" } OR (data) => data.livelli > 10
     * @returns {Array<{id: number, data: any}>} Array of matched objects
     */
    static getElements(objectiveName, query) {
        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return [];

        const result = [];
        const isFunction = typeof query === "function";
        const isObject = typeof query === "object" && query !== null;

        for (const p of objective.getParticipants()) {
            const parsed = this._parse(p.displayName);
            if (parsed !== null) {
                let match = true; // Di base, se non c'è query, tutti sono validi

                // Se è stata passata una query, verifichiamo la condizione
                if (query !== undefined) {
                    if (isFunction) {
                        match = query(parsed);
                    } else if (isObject) {
                        for (const key in query) {
                            if (parsed[key] !== query[key]) {
                                match = false;
                                break; // Interrompe il controllo chiavi per ottimizzare
                            }
                        }
                    }
                }

                // Se la condizione è soddisfatta (o se non c'era nessuna condizione), aggiungi ai risultati
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

    /* =========================
       UPDATE
    ========================= */

    /**
     * Update a JSON object while keeping the same ID
     */
    static updateById(objectiveName, id, newData) {
        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return false;

        for (const p of objective.getParticipants()) {
            if (objective.getScore(p) === id) {
                objective.removeParticipant(p);
                objective.setScore(this._stringify(newData), id);
                return true;
            }
        }
        return false;
    }

    /**
     * Update JSON objects based on conditions (Partial update / Merge).
     * - If 'query' is an object: finds records matching exact attributes.
     * - If 'query' is a function: finds records where the callback returns true.
     * @param {string} objectiveName
     * @param {object|function} query - Example: { uuid: "xxxxx" } OR (data) => data.livello < 10
     * @param {object|function} newData - The properties to update, OR a callback (oldData) => newData
     * @returns {number} The amount of records successfully updated
     */
    static update(objectiveName, query, newData) {
        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return 0;

        let updatedCount = 0;
        const isQueryFunction = typeof query === "function";
        const isQueryObject = typeof query === "object" && query !== null;
        
        // Permette di passare una funzione per calcoli complessi (es. oldData.money + 100)
        const isNewDataFunction = typeof newData === "function";

        for (const p of objective.getParticipants()) {
            const parsed = this._parse(p.displayName);
            if (parsed !== null) {
                let match = false;

                // 1. Verifica la condizione (Query)
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

                // 2. Se c'è un match, aggiorna i dati
                if (match) {
                    const id = objective.getScore(p);
                    objective.removeParticipant(p);
                    
                    let dataToSave;
                    if (isNewDataFunction) {
                        // L'utente ha fornito una funzione per modificare i vecchi dati
                        dataToSave = newData(parsed);
                    } else {
                        // Merge: Unisce i vecchi dati con i nuovi (sovrascrive solo le chiavi fornite)
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
     * Delete a record by ID
     */
    static deleteById(objectiveName, id) {
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
     * @param {string} objectiveName
     * @param {object|function} query - Example: { fazione: "Banditi" } OR (data) => data.livello < 5
     * @returns {number} The amount of records successfully deleted
     */
    static delete(objectiveName, query) {
        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return 0;

        let deletedCount = 0;
        const isQueryFunction = typeof query === "function";
        const isQueryObject = typeof query === "object" && query !== null;

        for (const p of objective.getParticipants()) {
            const parsed = this._parse(p.displayName);
            if (parsed !== null) {
                let match = false;

                // 1. Verifica la condizione (Query)
                if (isQueryFunction) {
                    match = query(parsed);
                } else if (isQueryObject) {
                    match = true;
                    for (const key in query) {
                        if (parsed[key] !== query[key]) {
                            match = false;
                            break; // Ottimizzazione: smette al primo attributo che non combacia
                        }
                    }
                }

                // 2. Se c'è un match, elimina il record e aggiorna il contatore
                if (match) {
                    objective.removeParticipant(p);
                    deletedCount++;
                }
            }
        }
        
        return deletedCount;
    }

    /* =========================
       SEARCH
    ========================= */

    /**
     * Find a JSON object using a callback
     * callback(data) => boolean
     */
    static find(objectiveName, callback) {
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

    /* =========================
       ADVANCED SEARCH & QUERY
    ========================= */

    /**
     * Find ALL JSON objects using a callback
     * callback(data) => boolean
     * @returns {Array} Array of matched objects {id, data}
     */
    static findAll(objectiveName, callback) {
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

    /**
     * Check if a record exists.
     * - If 'query' is omitted: returns true if the objective has AT LEAST one record.
     * - If 'query' is a number: checks the ID (fast, no parsing).
     * - If 'query' is an object: parses records to find a match.
     * @param {string} objectiveName
     * @param {number|object} [query] - Optional. Example: 5 OR { name: "StellaEXE", livelli: 50 }
     * @returns {boolean}
     */
    static exists(objectiveName, query) {
        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return false;

        // Se query non viene passata, controlliamo solo se c'è almeno un record salvato
        if (query === undefined) {
            return objective.getParticipants().length > 0;
        }

        const isId = typeof query === "number";

        for (const p of objective.getParticipants()) {
            // 1. Ricerca iper-veloce tramite ID
            if (isId) {
                if (objective.getScore(p) === query) return true;
                continue;
            }

            // 2. Ricerca per attributi
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
     * @param {string} objectiveName
     * @param {object|function} [query] - Optional. Example: { role: "admin" } OR (data) => data.livelli > 10
     * @returns {number}
     */
    static count(objectiveName, query) {
        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return 0;

        const participants = objective.getParticipants();

        // 1. Se non ci sono condizioni, ritorna semplicemente il totale
        if (query === undefined) {
            return participants.length;
        }

        let totalCount = 0;
        const isFunction = typeof query === "function";

        for (const p of participants) {
            const parsed = this._parse(p.displayName);
            if (!parsed) continue;

            // 2. Condizione tramite funzione (es. per calcoli matematici > o <)
            if (isFunction) {
                if (query(parsed)) totalCount++;
            } 
            // 3. Condizione tramite oggetto (match esatto degli attributi)
            else if (typeof query === "object") {
                let match = true;
                for (const key in query) {
                    if (parsed[key] !== query[key]) {
                        match = false;
                        break; // Ottimizzazione: smette di controllare se un attributo non combacia
                    }
                }
                if (match) totalCount++;
            }
        }

        return totalCount;
    }

    /* =========================
       CLEAR
    ========================= */

    /**
     * Remove all participants from the objective
     */
    static clear(objectiveName) {
        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return;

        for (const p of objective.getParticipants()) {
            objective.removeParticipant(p);
        }
    }
}
