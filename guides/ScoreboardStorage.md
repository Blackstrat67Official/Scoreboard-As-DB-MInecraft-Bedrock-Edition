# 🗄️ ScoreboardStorage

`ScoreboardStorage` is a powerful, NoSQL-like database utility for Minecraft Bedrock Edition. It leverages the game's native scoreboard system to store persistent, structured JSON data.

### How it works behind the scenes:
* **Objective:** Acts as the logical database/collection (e.g., `players`, `guilds`).
* **Participant (Name):** The actual serialized JSON data string.
* **Score:** The unique ID (memory address) to quickly identify and fetch records.

---

## 📑 Table of Contents

- [Write Operations](#️-write-operations)
  - [`save()`](#saveobjectivename-data)
- [Read & Query Operations](#-read--query-operations)
  - [`getElementById()`](#getelementbyidobjectivename-id)
  - [`getElements()`](#getelementsobjectivename-query)
  - [`find()`](#findobjectivename-callback)
  - [`findAll()`](#findallobjectivename-callback)
- [Update & Delete Operations](#-update--delete-operations)
  - [`updateById()`](#updatebyidobjectivename-id-newdata)
  - [`deleteById()`](#deletebyidobjectivename-id)
  - [`clear()`](#clearobjectivename)
- [Utility Methods](#-utility-methods)
  - [`exists()`](#existsobjectivename-query)
  - [`count()`](#countobjectivename-query)

---

## ✍️ Write Operations

### `save(objectiveName, data)`
Saves a new JSON object into the specified scoreboard objective and automatically assigns it the next available unique ID.

- **Parameters:**
  - `objectiveName` *(string)* - The name of the database/objective.
  - `data` *(object)* - The JavaScript object to store.
- **Returns:** `number` - The unique ID assigned to the new record.

```javascript
const newId = ScoreboardStorage.save("players", { 
    name: "StellaEXE", 
    level: 50, 
    isVip: true 
});
// Returns: 1 (or the next available ID)

```

---

## 🔍 Read & Query Operations

### `getElementById(objectiveName, id)`

Retrieves a single JSON object using its unique ID.

* **Parameters:**
* `objectiveName` *(string)*
* `id` *(number)* - The unique ID of the record.


* **Returns:** `object | null` - The parsed data, or null if not found.

```javascript
const player = ScoreboardStorage.getElementById("players", 1);

```

### `getElements(objectiveName, [query])`

Retrieves stored records. This is a highly versatile method that acts as your primary database fetcher.

* **Parameters:**
* `objectiveName` *(string)*
* `query` *(object | function, optional)* - The filter condition.


* **Returns:** `Array<{id: number, data: object}>` - An array of matching records.

```javascript
// 1. Get ALL records
const allPlayers = ScoreboardStorage.getElements("players");

// 2. Get records matching EXACT attributes (Object Query)
const admins = ScoreboardStorage.getElements("players", { role: "admin" });

// 3. Get records using complex logic (Callback Query)
const highLevels = ScoreboardStorage.getElements("players", (p) => p.level > 50);

```

### `find(objectiveName, callback)`

Finds the **first** record that matches the provided callback function condition.

* **Parameters:**
* `objectiveName` *(string)*
* `callback` *(function)* - Function that evaluates each parsed object.


* **Returns:** `{id: number, data: object} | null`

### `findAll(objectiveName, callback)`

*Note: Similar to `getElements` with a callback.* Finds **all** records that match the callback condition.

---

## ✏️ Update & Delete Operations

### `updateById(objectiveName, id, newData)`

Overwrites the data of an existing record while keeping the same ID.

* **Parameters:**
* `objectiveName` *(string)*
* `id` *(number)* - The ID of the record to update.
* `newData` *(object)* - The completely new data object.


* **Returns:** `boolean` - `true` if successful, `false` if the ID was not found.

```javascript
ScoreboardStorage.updateById("players", 1, { name: "StellaEXE", level: 51 });

```

### `deleteById(objectiveName, id)`

Permanently removes a record from the database.

* **Parameters:**
* `objectiveName` *(string)*
* `id` *(number)* - The ID of the record to delete.


* **Returns:** `boolean` - `true` if deleted, `false` if not found.

### `clear(objectiveName)`

**Warning: Destructive action.** Removes ALL records from the specified objective.

```javascript
ScoreboardStorage.clear("temporary_data");

```

---

## ⚙️ Utility Methods

### `exists(objectiveName, [query])`

A highly optimized method to check if a record exists.

* **Parameters:**
* `objectiveName` *(string)*
* `query` *(number | object, optional)*


* **Returns:** `boolean`

```javascript
// Check if the database has ANY data
const hasData = ScoreboardStorage.exists("players");

// Check if a specific ID exists (Extremely fast, skips JSON parsing)
const idExists = ScoreboardStorage.exists("players", 5);

// Check if a record with specific attributes exists
const playerExists = ScoreboardStorage.exists("players", { name: "StellaEXE" });

```

### `count(objectiveName, [query])`

Returns the total number of records that match the given criteria.

* **Parameters:**
* `objectiveName` *(string)*
* `query` *(object | function, optional)*


* **Returns:** `number`

```javascript
// Fast count of ALL records
const totalPlayers = ScoreboardStorage.count("players");

// Count matching exact attributes
const vipCount = ScoreboardStorage.count("players", { isVip: true });

// Count using mathematical logic
const richPlayers = ScoreboardStorage.count("players", (p) => p.money > 10000);

```
