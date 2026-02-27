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
    static getById(objectiveName, id) {
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
     * Retrieve all stored JSON objects
     */
    static getAll(objectiveName) {
        const objective = world.scoreboard.getObjective(objectiveName);
        if (!objective) return [];

        const result = [];
        for (const p of objective.getParticipants()) {
            const parsed = this._parse(p.displayName);
            if (parsed !== null) {
                result.push({
                    id: objective.getScore(p),
                    data: parsed
                });
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
