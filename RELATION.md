# 🔗 Relation Utility

The `Relation` class acts as a powerful data hydrator for your NoSQL-like Scoreboard database.

It allows you to define "Foreign Key" relationships between different data objectives (tables) and automatically resolves them. Instead of manually writing complex loops to fetch linked data, you can use `.populate()` to instantly inject the associated records directly into your objects.

**Performance Optimized:** It features "Selective Population", meaning you can choose to hydrate only specific relationships when querying data, saving precious CPU cycles and memory.

---

## 📑 Table of Contents

* [Defining Relationships](https://www.google.com/search?q=%23-defining-relationships)
* [`bind()`](https://www.google.com/search?q=%23bindsourceobjective-localfield-targetobjective-targetfield-as)


* [Hydrating Data](https://www.google.com/search?q=%23-hydrating-data)
* [`populate()`](https://www.google.com/search?q=%23populateobjectivename-rawdata-relationstopopulate)


* [Cleanup](https://www.google.com/search?q=%23-cleanup)
* [`reset()`](https://www.google.com/search?q=%23reset)


* [Best Practice: Centralized Setup](https://www.google.com/search?q=%23-best-practice-centralized-setup)

---

## 🏗️ Defining Relationships

### `bind(sourceObjective, localField, targetObjective, targetField, as)`

Registers a relationship rule in the memory. This tells the system how two different scoreboard databases are linked together.

* **Parameters:**
* `sourceObjective` *(string)* - The starting table/objective (e.g., `"players"`).
* `localField` *(string)* - The attribute in the source holding the ID or array of IDs (e.g., `"guildId"`).
* `targetObjective` *(string)* - The target table/objective to search in (e.g., `"guilds"`).
* `targetField` *(string)* - The attribute in the target that matches the ID (e.g., `"uuid"`).
* `as` *(string)* - The name of the new property where the populated data will be injected (e.g., `"guildData"`).



```javascript
// Example 1: Many-to-One (A player belongs to one guild)
Relation.bind("players", "guildId", "guilds", "uuid", "guildData");

// Example 2: One-to-Many (A guild has an array of member UUIDs)
Relation.bind("guilds", "members", "players", "uuid", "memberData");

```

---

## 💧 Hydrating Data

### `populate(objectiveName, rawData, [relationsToPopulate])`

Takes a raw object (or an array of objects) extracted from `ScoreboardStorage` and hydrates it based on the rules defined in `bind()`. It fetches the linked data and injects it into the specified `as` field.

* **Parameters:**
* `objectiveName` *(string)* - The source objective name of the raw data (e.g., `"players"`).
* `rawData` *(object | Array<object>)* - The raw data to populate.
* `relationsToPopulate` *(string | Array<string>, optional)* - The specific relation name(s) (the `as` field) to populate. If omitted, it populates ALL defined relationships for that objective.


* **Returns:** `object | Array<object>` - A cloned version of the data with the injected relational fields.

```javascript
// 1. Fetch the raw data from the database
const rawPlayer = ScoreboardStorage.getElements("players", { name: "StellaEXE" })[0].data;
// rawPlayer is: { name: "StellaEXE", guildId: "gilda-123", petId: "drago-99" }

// --- USE CASE A: Populate EVERYTHING ---
const fullPlayer = Relation.populate("players", rawPlayer);
// Result: contains both fullPlayer.guildData AND fullPlayer.petData

// --- USE CASE B: Selective Population (Performance Optimized!) ---
// If we are just opening the Guild Menu, we don't need the Pet data.
const guildOnlyPlayer = Relation.populate("players", rawPlayer, "guildData");
/* Result:
{
    name: "StellaEXE",
    guildId: "gilda-123",
    petId: "drago-99",
    guildData: { uuid: "gilda-123", name: "Dark Knights", level: 10 } 
    // Notice: petData was ignored to save CPU!
}
*/

// --- USE CASE C: Multiple specific relations ---
const mixedPlayer = Relation.populate("players", rawPlayer, ["guildData", "factionData"]);

```

---

## 🧹 Cleanup

### `reset()`

Clears all relationship bindings from memory. It is highly recommended to call this method during your centralized setup to prevent duplicate rules when the server reloads.

* **Returns:** `void`

```javascript
// Wipes all relationship rules from RAM
Relation.reset();

```

---

## 💡 Best Practice: Centralized Setup

Just like with schemas, it is highly recommended to create a dedicated configuration file (e.g., `relationSetup.js`) to map out your entire database architecture in one place.

This file resets the memory and defines all your database relationships every time the world loads or the `/reload` command is used.

### 1. Create `relationSetup.js`

```javascript
import { Relation } from "./db/Relation.js";

// 1. Reset old relations on server start/reload to prevent duplicates
Relation.reset();

// 2. Define all your database relationships here

// --- PLAYER RELATIONS ---
// A player has a Guild
Relation.bind("players", "guildId", "guilds", "uuid", "guildData");
// A player has a Pet
Relation.bind("players", "petId", "pets", "uuid", "petData");
// A player has a Faction
Relation.bind("players", "factionId", "factions", "uuid", "factionData");

// --- GUILD RELATIONS ---
// A guild has many Members (Array of UUIDs)
Relation.bind("guilds", "members", "players", "uuid", "memberData");

console.warn("[Database] All Database Relations linked successfully!");

```

### 2. Import into your Entry Point (`main.js`)

Simply import the setup file at the top of your main add-on script, right after your `schemaSetup.js`. The file will run automatically, establishing the links between your tables.

```javascript
// main.js (Your Add-on Entry Point)
import { world } from "@minecraft/server";
import { ScoreboardStorage } from "./db/ScoreboardStorage.js";

// Initialize database architecture
import "./schemaSetup.js";
import "./relationSetup.js"; // This runs the bind() functions automatically!

import { Relation } from "./db/Relation.js";

// Example Usage in game:
world.beforeEvents.chatSend.subscribe((event) => {
    if (event.message === "!myguild") {
        event.cancel = true;
        
        // 1. Get raw player
        const rawPlayer = ScoreboardStorage.getElements("players", { name: event.sender.name })[0]?.data;
        if (!rawPlayer) return;

        // 2. Populate ONLY the guild data (Fast & Optimized)
        const populatedPlayer = Relation.populate("players", rawPlayer, "guildData");
        
        if (populatedPlayer.guildData) {
            event.sender.sendMessage(`You are in the guild: ${populatedPlayer.guildData.name}`);
        } else {
            event.sender.sendMessage(`You are not in a guild.`);
        }
    }
});

```
