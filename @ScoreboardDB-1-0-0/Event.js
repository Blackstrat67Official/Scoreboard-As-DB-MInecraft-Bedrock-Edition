/**
 * Database Event Management Utility
 * * Implements a Pub/Sub (Observer) pattern for the database.
 * Allows different parts of your Add-on to listen for database changes
 * (like inserts, updates, or deletes) without tightly coupling the code.
 */
export class Event {
    /**
     * RAM memory to store all registered listeners.
     * Structure: Map<EventName, Array<CallbackFunction>>
     * @type {Map<string, Array<function>>}
     */
    static _listeners = new Map();

    /* =========================
       SUBSCRIBE (LISTEN)
    ========================= */

    /**
     * Subscribes to a specific database event.
     * @param {string} eventName - The name of the event (e.g., "update:players").
     * @param {function} callback - The function to execute when the event fires.
     */
    static on(eventName, callback) {
        if (typeof callback !== "function") {
            throw new TypeError("[DatabaseEvent] Callback must be a function.");
        }

        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, []);
        }

        this._listeners.get(eventName).push(callback);
    }

    /**
     * Unsubscribes a specific callback from an event.
     * @param {string} eventName - The name of the event.
     * @param {function} callback - The specific function to remove.
     */
    static off(eventName, callback) {
        if (!this._listeners.has(eventName)) return;

        const filteredListeners = this._listeners.get(eventName).filter(cb => cb !== callback);
        
        if (filteredListeners.length === 0) {
            this._listeners.delete(eventName);
        } else {
            this._listeners.set(eventName, filteredListeners);
        }
    }

    /* =========================
       PUBLISH (EMIT)
    ========================= */

    /**
     * Triggers an event, passing data to all registered listeners.
     * @param {string} eventName - The name of the event to trigger.
     * @param {object} eventData - The payload containing info about the change.
     */
    static emit(eventName, eventData = {}) {
        if (!this._listeners.has(eventName)) return;

        // Execute all callback functions registered for this event
        const callbacks = this._listeners.get(eventName);
        for (const callback of callbacks) {
            try {
                callback(eventData);
            } catch (error) {
                console.warn(`[DatabaseEvent] Error in listener for event '${eventName}':`, error);
            }
        }
    }

    /* =========================
       CLEANUP
    ========================= */

    /**
     * Removes all registered event listeners.
     * Useful during server reloads.
     */
    static reset() {
        this._listeners.clear();
    }
}
