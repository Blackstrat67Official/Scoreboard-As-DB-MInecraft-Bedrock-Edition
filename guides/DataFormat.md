# 🛠️ DataFormat Utility

The `DataFormat` class provides a suite of data generators, validators, and converters tailored specifically for the `ScoreboardStorage` system. 

Since data is saved as JSON strings within Minecraft Bedrock scoreboards, this utility serves two main purposes:
1. **Sanitize Data:** Prevent `undefined` or corrupted values that would cause `JSON.parse()` to fail.
2. **Save Space:** Optimize and compress data (e.g., rounding coordinates or converting booleans to bits) to stay within the engine's physical memory limits.

---

## 📑 Table of Contents

- [Generators & Base Structures](#-generators--base-structures)
  - [`uuid()`](#uuidexistinguuid)
  - [`timestamp()`](#timestampinput)
  - [`vector3()`](#vector3x-y-z)
  - [`clampNumber()`](#clampnumbervalue-fallback-min-max)
- [Data Converters (Optimization)](#-data-converters-optimization)
  - [`toBinary()`](#tobinaryinput)
  - [`toHex()`](#tohexinput)
  - [`toBit()`](#tobitbool)
  - [`toCSV()`](#tocsvarray)

---

## 🧱 Generators & Base Structures

### `uuid([existingUuid])`
Generates a new UUID v4 or returns the provided one. Perfect for assigning unique identifiers to custom items, homes, guilds, etc.

- **Parameters:**
  - `existingUuid` *(string, optional)* - If provided and valid, it is returned directly.
- **Returns:** `string`

```javascript
const newId = DataFormat.uuid(); 
// Output: "f47ac10b-58cc-4372-a567-0e02b2c3d479"

```

### `timestamp([input])`

Standardizes a time reference in milliseconds (Epoch).

* **Parameters:**
* `input` *(number | Date, optional)* - A Date object or a number. If omitted, returns the current timestamp.


* **Returns:** `number`

```javascript
const now = DataFormat.timestamp(); // Output: 1709028456123

```

### `vector3(x, [y], [z])`

Standardizes Minecraft coordinates into a clean object and rounds values to 2 decimal places to **save space in the JSON payload**. It can directly accept a native Bedrock `location` object.

* **Parameters:**
* `x` *(number | object)* - The X coordinate, or a native object containing `{x, y, z}` (e.g., `player.location`).
* `y` *(number, optional)* - The Y coordinate.
* `z` *(number, optional)* - The Z coordinate.


* **Returns:** `{x: number, y: number, z: number}`

```javascript
// From a native Bedrock location object
const loc1 = DataFormat.vector3(player.location); 
// Output: { x: 10.55, y: 64.00, z: -15.22 }

// From separate coordinates
const loc2 = DataFormat.vector3(10, 64, -15);

```

### `clampNumber(value, [fallback], [min], [max])`

Ensures an input is a valid number and falls within a specific range. Ideal for stats, currency, or levels.

* **Parameters:**
* `value` *(any)* - The value to check.
* `fallback` *(number, default: 0)* - Fallback value if the input is `NaN`.
* `min` *(number, default: -Infinity)* - Minimum allowed value.
* `max` *(number, default: Infinity)* - Maximum allowed value.


* **Returns:** `number`

```javascript
// Ensures money is at least 0
const money = DataFormat.clampNumber(-50, 0, 0); // Output: 0

```

---

## 🔄 Data Converters (Optimization)

### `toBinary(input)`

Converts a string or number into binary format. Useful for creating bitmasks or obfuscating sensitive data saved in the scoreboard.

* **Parameters:** `input` *(string | number)*
* **Returns:** `string`

```javascript
DataFormat.toBinary(5); // Output: "101"
DataFormat.toBinary("A"); // Output: "01000001"

```

### `toHex(input)`

Converts a string or number into hexadecimal format. Useful for shortening very long numbers or hiding plain text.

* **Parameters:** `input` *(string | number)*
* **Returns:** `string`

```javascript
DataFormat.toHex(255); // Output: "ff"
DataFormat.toHex("Hello"); // Output: "48656c6c6f"

```

### `toBit(bool)`

Converts a boolean into a single bit (`1` or `0`). Since saving the string `"true"` takes 4 bytes and saving `"1"` takes just 1 byte, this function is vital for optimizing large permission arrays and flags.

* **Parameters:** `bool` *(boolean)*
* **Returns:** `number` (1 or 0)

```javascript
const isVip = DataFormat.toBit(true); // Output: 1

```

### `toCSV(array)`

Converts a simple array into a CSV (Comma Separated Values) string. This removes the JSON brackets `[]` and quotes `""`, saving a significant amount of space for simple lists (e.g., tags or IDs).

* **Parameters:** `array` *(Array)*
* **Returns:** `string`

```javascript
const tags = DataFormat.toCSV(["admin", "builder", "vip"]); 
// Output: "admin,builder,vip"

```
