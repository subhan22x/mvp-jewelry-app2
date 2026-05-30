#!/usr/bin/env node
/**
 * Pendant style manager.
 *
 * Styles live in data/pendant-styles.json so they remain bundled with the app.
 * This script is a light CLI to add/update/remove entries without hand-editing JSON.
 *
 * Usage examples:
 *   node scripts/manage-styles.mjs list
 *   node scripts/manage-styles.mjs add --id=aria --label="Aria" --src=/pendants/aria.png
 *   node scripts/manage-styles.mjs update --id=lexy --label="Lexy II"
 *   node scripts/manage-styles.mjs remove --id=king
 */

import fs from "node:fs";
import path from "node:path";

const stylesPath = path.resolve(process.cwd(), "data/pendant-styles.json");
const prismaSchemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");

if (!fs.existsSync(stylesPath)) {
  console.error(`Cannot find ${stylesPath}.`);
  process.exit(1);
}

const [command, ...restArgs] = process.argv.slice(2);
const options = parseOptions(restArgs);

switch (command) {
  case "list":
    handleList();
    break;
  case "add":
    handleAdd(options);
    break;
  case "update":
    handleUpdate(options);
    break;
  case "remove":
    handleRemove(options);
    break;
  case "help":
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp(true);
}

function parseOptions(args) {
  return args.reduce((acc, pair) => {
    const [key, value = ""] = pair.replace(/^--/, "").split("=");
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function readStyles() {
  const contents = fs.readFileSync(stylesPath, "utf8");
  return JSON.parse(contents);
}

function writeStyles(styles) {
  const sorted = [...styles].sort((a, b) => a.label.localeCompare(b.label));
  const json = JSON.stringify(sorted, null, 2);
  fs.writeFileSync(stylesPath, `${json}\n`, "utf8");
  syncStyleEnum(sorted);
}

function handleList() {
  const styles = readStyles();
  if (!styles.length) {
    console.log("No styles defined yet.");
    return;
  }
  console.table(styles);
}

function handleAdd({ id, label, src, accent }) {
  if (!id || !label || !src) {
    console.error("add requires --id, --label, and --src");
    process.exit(1);
  }
  const styles = readStyles();
  if (styles.some(style => style.id === id)) {
    console.error(`Style with id "${id}" already exists.`);
    process.exit(1);
  }
  styles.push({ id, label, src, ...(accent ? { accent } : {}) });
  writeStyles(styles);
  console.log(`Added style ${id}.`);
}

function handleUpdate({ id, label, src, accent }) {
  if (!id) {
    console.error("update requires --id");
    process.exit(1);
  }
  const styles = readStyles();
  const target = styles.find(style => style.id === id);
  if (!target) {
    console.error(`No style found with id "${id}".`);
    process.exit(1);
  }
  if (label) target.label = label;
  if (src) target.src = src;
  if (accent !== undefined) target.accent = accent || undefined;
  writeStyles(styles);
  console.log(`Updated style ${id}.`);
}

function handleRemove({ id }) {
  if (!id) {
    console.error("remove requires --id");
    process.exit(1);
  }
  const styles = readStyles();
  const next = styles.filter(style => style.id !== id);
  if (next.length === styles.length) {
    console.error(`No style found with id "${id}".`);
    process.exit(1);
  }
  writeStyles(next);
  console.log(`Removed style ${id}.`);
}

function printHelp(exitWithError = false) {
  console.log(`Usage: node scripts/manage-styles.mjs <command> [--key=value]

Commands:
  list                      Print the current styles table.
  add --id=ID --label=TXT --src=/path   Add a new style (optional --accent=HEX).
  update --id=ID [--label=TXT] [--src=/path] [--accent=HEX] Update fields for a style.
  remove --id=ID            Delete a style.
`);
  process.exit(exitWithError ? 1 : 0);
}

function syncStyleEnum(styles) {
  if (!fs.existsSync(prismaSchemaPath)) {
    console.warn(`Skipping enum sync: ${prismaSchemaPath} not found.`);
    return;
  }

  const enumValues = styles.map(style => formatEnumName(style.id));

  const duplicates = enumValues.filter((value, index) => enumValues.indexOf(value) !== index);
  if (duplicates.length) {
    console.error(
      `Cannot sync StyleName enum because the following IDs map to duplicate enum names: ${[...new Set(duplicates)].join(
        ", "
      )}`
    );
    process.exit(1);
  }

  const schema = fs.readFileSync(prismaSchemaPath, "utf8");
  const enumRegex = /enum StyleName\s*{[\s\S]*?}/m;
  const replacement = `enum StyleName {\n${enumValues.map(value => `  ${value}`).join("\n")}\n}`;

  if (!enumRegex.test(schema)) {
    console.error(`Could not find StyleName enum definition inside ${prismaSchemaPath}.`);
    process.exit(1);
  }

  const nextSchema = schema.replace(enumRegex, replacement);
  if (nextSchema !== schema) {
    fs.writeFileSync(prismaSchemaPath, nextSchema, "utf8");
    console.log(`Synced StyleName enum with ${enumValues.length} pendant style(s).`);
  }
}

function formatEnumName(id) {
  const normalized = id.trim();
  if (!normalized) {
    console.error("Style id must be a non-empty string.");
    process.exit(1);
  }

  let candidate = normalized
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toUpperCase();

  if (!candidate) {
    console.error(`Style id "${id}" cannot be converted into a valid enum name.`);
    process.exit(1);
  }

  if (/^[0-9]/.test(candidate)) {
    candidate = `_${candidate}`;
  }

  return candidate;
}
