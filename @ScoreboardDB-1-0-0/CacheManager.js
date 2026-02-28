import { ScoreboardStorage } from "./ScoreboardStorage";

/**
 * Cache Management Utility
 * * Acts as a high-speed RAM layer over the physical ScoreboardStorage.
 * Eliminates the lag caused by repetitive JSON.parse() operations
 * by keeping a synchronized copy of the database in memory.
 */
export class CacheManager {
    /**
     * The internal memory (RAM).
     * Structure: Map<ObjectiveName, Map<RecordID, ParsedData>>
     * @type {Map<string, Map<number, object>>}
     */
    static _memory = new Map();

    /* =========================
       INTERNAL SYNC
    ========================= */

    /**
     * Lazy Loading: Ensures an objective's data is loaded into RAM.
     * It reads from the physical scoreboard ONLY the very first time.
     * @param {string} objectiveName - The objective to load.
     */
    static _ensureLoaded(objectiveName) {
        if (this._memory.has(objectiveName)) {
            return; // Already in RAM, do nothing (Instant!)
        }

        const objectiveCache = new Map();
        
        // Read EVERYTHING from the physical scoreboard (Slow, but only happens once)
        const physicalRecords = ScoreboardStorage.getElements(objectiveName);
        
        for (const record of physicalRecords) {
            objectiveCache.set(record.id, record.data);
        }

        this._memory.set(objectiveName, objectiveCache);
    }

    /* =========================
       READ (RAM SPEED - INSTANT)
    ========================= */

    /**
     * Retrieve a JSON object by its ID directly from RAM.
     * @param {string} objectiveName 
     * @param {number} id 
     * @returns {object|null}
     */
    static getById(objectiveName, id) {
        this._ensureLoaded(objectiveName);
        return this._memory.get(objectiveName).get(id) || null;
    }

    /**
     * Retrieve all records for an objective from RAM.
     * @param {string} objectiveName 
     * @returns {Array<{id: number, data: object}>}
     */
    static getAll(objectiveName) {
        this._ensureLoaded(objectiveName);
        
        const results = [];
        const objectiveCache = this._memory.get(objectiveName);
        
        // Iterating over a JS Map is incredibly faster than iterating scoreboard participants
        for (const [id, data] of objectiveCache.entries()) {
            results.push({ id, data });
        }
        
        return results;
    }

    /* =========================
       WRITE (RAM + SCOREBOARD SYNC)
    ========================= */

    /**
     * Save a new object. Writes to physical storage and updates RAM.
     * @param {string} objectiveName 
     * @param {object} data 
     * @returns {number} The generated ID
     */
    static save(objectiveName, data) {
        this._ensureLoaded(objectiveName); // Make sure the cache is ready

        // 1. Save Physically (To ensure data persists after a restart)
        const newId = ScoreboardStorage.save(objectiveName, data);

        // 2. Save in RAM (To make future reads instant)
        this._memory.get(objectiveName).set(newId, data);

        return newId;
    }

    /**
     * Update an object by ID. Updates physical storage and RAM.
     * @param {string} objectiveName 
     * @param {number} id 
     * @param {object} newData 
     * @returns {boolean}
     */
    static updateById(objectiveName, id, newData) {
        this._ensureLoaded(objectiveName);

        // 1. Update Physically
        const success = ScoreboardStorage.updateById(objectiveName, id, newData);

        if (success) {
            // 2. Update RAM only if physical update was successful
            this._memory.get(objectiveName).set(id, newData);
        }

        return success;
    }

    /**
     * Delete an object by ID. Removes from physical storage and RAM.
     * @param {string} objectiveName 
     * @param {number} id 
     * @returns {boolean}
     */
    static deleteById(objectiveName, id) {
        this._ensureLoaded(objectiveName);

        // 1. Delete Physically
        const success = ScoreboardStorage.deleteById(objectiveName, id);

        if (success) {
            // 2. Delete from RAM
            this._memory.get(objectiveName).delete(id);
        }

        return success;
    }
}
