# 📡 Events Utility

The `Events` class implements a lightweight, high-performance Pub/Sub (Observer) pattern for your Minecraft Bedrock Add-on. 

It acts as the "central nervous system" of your codebase, allowing different scripts and modules to communicate with each other without being tightly coupled. You can use it to automatically hook into database changes or to broadcast custom in-game events (like a player leveling up, creating a guild, or buying an item).

---

## 📑 Table of Contents

- [Event Subscription](#-event-subscription)
  - [`on()`](#oneventname-callback)
  - [`off()`](#offeventname-callback)
- [Event Broadcasting](#-event-broadcasting)
  - [`emit()`](#emiteventname-eventdata)
- [Cleanup](#-cleanup)
  - [`reset()`](#reset)
- [Best Practice: Decoupled Architecture](#-best-practice-decoupled-architecture)

---

## 🎧 Event Subscription

### `on(eventName, callback)`
Subscribes to a specific event. Whenever this event is triggered anywhere in your codebase, the provided callback function will be executed.

- **Parameters:**
  - `eventName` *(string)* - The unique name of the event to listen for (e.g., `"guild:created"`, `"db:players:update"`).
  - `callback` *(function)* - The function to execute when the event fires. It receives the emitted data as its first argument.
- **Throws:** `TypeError` if the callback is not a valid function.

```javascript
// Listen for a custom event
Events.on("player:levelUp", (data) => {
    console.warn(`${data.playerName} just reached level ${data.newLevel}!`);
});

```

### `off(eventName, callback)`

Unsubscribes a specific callback function from an event. Useful if you only want to listen to an event temporarily.
*Note: You must pass the exact same function reference that was used in `on()`.*

* **Parameters:**
* `eventName` *(string)* - The name of the event.
* `callback` *(function)* - The exact function reference to remove.



```javascript
const myTempListener = (data) => {
    // Do something once...
    Events.off("match:started", myTempListener); // Remove itself after running
};

Events.on("match:started", myTempListener);

```

---

## 📢 Event Broadcasting

### `emit(eventName, [eventData])`

Triggers an event and broadcasts the provided data payload to all currently registered listeners. If no listeners are registered for the event, it safely does nothing.

* **Parameters:**
* `eventName` *(string)* - The name of the event to trigger.
* `eventData` *(object, optional)* - The payload containing the information you want to pass to the listeners. Defaults to an empty object `{}`.


* **Returns:** `void`

```javascript
const player = event.sender;

// Trigger the event and pass relevant data
Events.emit("player:levelUp", {
    playerName: player.name,
    newLevel: 5,
    timestamp: Date.now()
});

```

---

## 🧹 Cleanup

### `reset()`

Removes all registered event listeners from the memory. It is highly recommended to call this method during your centralized setup (e.g., when the server reloads) to prevent duplicate listeners from piling up and causing memory leaks.

* **Returns:** `void`

```javascript
// Wipes all event listeners from RAM
Events.reset();

```

---

## 💡 Best Practice: Decoupled Architecture

The true power of the `Events` class is **Decoupling**. You can split your logic across multiple files without them needing to import each other directly.

Here is an example of how a single event emitted from a chat command can trigger multiple independent systems.

### 1. The Trigger (`commands.js`)

This file only cares about receiving the chat command and broadcasting that something happened.

```javascript
import { world } from "@minecraft/server";
import { Events } from "./db/Events.js";

world.beforeEvents.chatSend.subscribe((event) => {
    if (event.message.startsWith("!createguild ")) {
        event.cancel = true;
        const guildName = event.message.replace("!createguild ", "");
        
        // 📢 Broadcast the event to the rest of the Add-on
        Events.emit("guild:created", {
            founder: event.sender.name,
            guildName: guildName
        });
        
        event.sender.sendMessage(`§aSuccessfully founded ${guildName}!`);
    }
});

```

### 2. The Database Handler (`guildDatabase.js`)

This file listens to the event and handles saving the data to your `ScoreboardStorage`. It doesn't know (or care) that a chat command triggered it.

```javascript
import { Events } from "./db/Events.js";
import { ScoreboardStorage } from "./db/ScoreboardStorage.js";

Events.on("guild:created", (data) => {
    // Safely save the new guild to the database
    ScoreboardStorage.save("guilds", {
        name: data.guildName,
        founder: data.founder,
        level: 1
    });
});

```

### 3. The Effects Handler (`vfx.js`)

This completely separate file listens to the exact same event just to play a sound and spawn particles.

```javascript
import { world } from "@minecraft/server";
import { Events } from "./db/Events.js";

Events.on("guild:created", (data) => {
    // Find the player and play a victory sound
    const players = world.getPlayers({ name: data.founder });
    if (players.length > 0) {
        players[0].playSound("random.levelup");
    }
    
    world.sendMessage(`§b[Server] §e${data.founder} has just founded the guild §l${data.guildName}§r§e!`);
});

```
