# 📐 DataSchema Utility

The `DataSchema` class provides a way to define strict blueprints (schemas) for your database structures. 

It acts as a middleware layer that automatically fills in missing fields with default values or executes generator functions (like creating UUIDs or exact Timestamps) *before* saving the data to the database, ensuring your records are always complete and predictable.

---

## 📑 Table of Contents

- [Initialization](#-initialization)
  - [`constructor()`](#constructorscoreboardname)
- [Schema Management](#-schema-management)
  - [`define()`](#defineschemaname-schemadefinition)
- [Data Processing](#-data-processing)
  - [`resolve()`](#resolveschemaname-inputdata)
- [Cleanup](#-cleanup)
  - [`reset()`](#reset)
- [Best Practice: Centralized Setup](#-best-practice-centralized-setup)

---

## 🚀 Initialization

### `constructor(scoreboardName)`
Initializes the Schema Manager instance. You must provide a dedicated scoreboard objective name where the textual metadata of your schemas will be stored.

- **Parameters:**
  - `scoreboardName` *(string)* - The objective name used to store schema metadata.
- **Throws:** `TypeError` if the scoreboard name is invalid or missing.

```javascript
// Initialize the schema manager targeting the "sys_schemas" objective
const schemaManager = new DataSchema("sys_schemas");

```

---

## 📝 Schema Management

### `define(schemaName, schemaDefinition)`

Registers a new data schema blueprint. This should ideally be executed once when the world or server starts. It stores generator logic in RAM and saves structural metadata to the physical scoreboard.

* **Parameters:**
* `schemaName` *(string)* - The unique name of the schema (e.g., "PlayerSchema").
* `schemaDefinition` *(object)* - The object defining default static values or generator functions.


* **Throws:** `TypeError` if the parameters are not valid strings/objects.

```javascript
// Register a new blueprint for Players
schemaManager.define("PlayerSchema", {
    // Dynamic generator functions (executed only when the field is missing)
    uuid: () => DataFormat.uuid(),
    joinedAt: () => DataFormat.timestamp(),
    
    // Static fallback values
    name: "Unknown Player",
    money: 100,
    isVip: false
});

```

---

## ⚙️ Data Processing

### `resolve(schemaName, [inputData])`

The core engine of the utility. It compares incoming, potentially incomplete user data against the predefined schema. It automatically fills any missing fields with the default values or executes the defined generator functions.

* **Parameters:**
* `schemaName` *(string)* - The name of the schema to apply.
* `inputData` *(object, optional)* - The partial/raw data provided by the user. Defaults to an empty object `{}`.


* **Returns:** `object` - The complete, strictly formatted object ready to be saved.
* **Throws:** `Error` if the requested schema hasn't been defined first.

```javascript
// 1. We receive incomplete data (e.g., just the player's name)
const rawInput = { name: "Steve" };

// 2. Resolve the data using the schema
const finalData = schemaManager.resolve("PlayerSchema", rawInput);

/* Output (finalData):
{
    name: "Steve",                                  <-- Preserved from input
    uuid: "f47ac10b-58cc-4372-a567-0e02b2c3d479",   <-- Auto-generated
    joinedAt: 1709034567123,                        <-- Auto-generated
    money: 100,                                     <-- Default fallback
    isVip: false                                    <-- Default fallback
} 
*/

// 3. Save safely to the database!
ScoreboardStorage.save("players", finalData);

```

---

## 🧹 Cleanup

### `reset()`

Completely resets the Schema Manager. It clears all schema definitions stored in the RAM memory and physically deletes all metadata records from the dedicated scoreboard.

**⚠️ Warning:** Use with extreme caution as this is a destructive action.

* **Returns:** `void`

```javascript
// Wipes all schemas from memory and the scoreboard
schemaManager.reset();

```

---

## 💡 Best Practice: Centralized Setup

When building your Add-on, it is highly recommended to create a dedicated configuration file (e.g., `schemaSetup.js`). This file will instantiate the manager, **reset it** to clear old data from previous server runs, and define all your schemas.

This ensures your schemas are freshly recreated every time the world loads or the `/reload` command is used.

### 1. Create `schemaSetup.js`

```javascript
import { DataSchema } from "./db/DataSchema.js";
import { DataFormat } from "./db/DataFormat.js";

// 1. Initialize the Schema Manager
export const schemaManager = new DataSchema("sys_schemas");

// 2. Reset old schemas on server start/reload to prevent memory leaks or conflicts
schemaManager.reset();

// 3. Define all your database schemas here
schemaManager.define("PlayerSchema", {
    uuid: () => DataFormat.uuid(),
    joinedAt: () => DataFormat.timestamp(),
    name: "Unknown",
    money: 100,
    isVip: false
});

schemaManager.define("GuildSchema", {
    id: () => DataFormat.uuid(),
    createdAt: () => DataFormat.timestamp(),
    name: "Unnamed Guild",
    members: [],
    level: 1
});

console.warn("[Database] All DataSchemas loaded successfully!");

```

### 2. Import into your Entry Point (`main.js`)

Simply import the `schemaManager` object you just exported at the very top of your main add-on script. The file will run automatically, setting up your entire database architecture.

```javascript
// main.js (Your Add-on Entry Point)
import { schemaManager } from "./schemaSetup.js";
...
```
