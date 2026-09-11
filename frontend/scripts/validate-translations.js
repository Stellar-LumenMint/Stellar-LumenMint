#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Missing keys are reported as warnings by default because localization is
// still in progress — failing on them would make CI red for a known backlog
// and train people to ignore the check. `--strict` promotes them to errors,
// which is what to use once locales reach parity. Structural problems (type
// mismatches, empty values) are always fatal: they break the UI today.
const strict = process.argv.includes('--strict');

const enPath = path.join(__dirname, '../locales/en/common.json');
const frPath = path.join(__dirname, '../locales/fr/common.json');

function flattenObject(obj, prefix = '') {
  const flattened = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }

  return flattened;
}

function collectEmptyValues(flat, locale) {
  const empty = [];

  for (const key in flat) {
    const value = flat[key];
    if (value === '' || value === null || value === undefined) {
      empty.push(`${locale}.${key}`);
    }
  }

  return empty;
}

function validateTranslations() {
  let enCommon;
  let frCommon;

  try {
    enCommon = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    frCommon = JSON.parse(fs.readFileSync(frPath, 'utf8'));
  } catch (error) {
    console.error('❌ Error reading translation files:', error.message);
    process.exit(1);
  }

  const enFlat = flattenObject(enCommon);
  const frFlat = flattenObject(frCommon);

  const missingKeys = [];
  const inconsistentTypes = [];
  const emptyValues = [];

  for (const key in enFlat) {
    if (!(key in frFlat)) {
      missingKeys.push(`fr.${key}`);
    }
  }

  for (const key in frFlat) {
    if (!(key in enFlat)) {
      missingKeys.push(`en.${key}`);
    }
  }

  for (const key in enFlat) {
    if (key in frFlat) {
      const enType = typeof enFlat[key];
      const frType = typeof frFlat[key];

      if (enType !== frType) {
        inconsistentTypes.push(`${key}: en(${enType}) vs fr(${frType})`);
      }
    }
  }

  emptyValues.push(...collectEmptyValues(enFlat, 'en'));
  emptyValues.push(...collectEmptyValues(frFlat, 'fr'));

  console.log('🔍 Translation Validation Results:');
  console.log('=====================================');

  // Structural correctness is always required; missing keys only in strict
  // mode.
  const isValid =
    inconsistentTypes.length === 0 &&
    emptyValues.length === 0 &&
    (!strict || missingKeys.length === 0);

  console.log(isValid ? '✅ Translation structure is valid!' : '❌ Translation validation failed:');

  if (missingKeys.length > 0) {
    const label = strict ? '🚫 Missing keys:' : '⚠️  Missing keys (non-blocking):';
    console.log(`\n${label}`);
    missingKeys.forEach((key) => console.log(`  - ${key}`));
  }

  if (inconsistentTypes.length > 0) {
    console.log('\n⚠️  Type inconsistencies:');
    inconsistentTypes.forEach((line) => console.log(`  - ${line}`));
  }

  if (emptyValues.length > 0) {
    console.log('\n⚠️  Empty values:');
    emptyValues.forEach((line) => console.log(`  - ${line}`));
  }

  console.log('\n📊 Summary:');
  console.log(`  - Total keys in English: ${Object.keys(enFlat).length}`);
  console.log(`  - Total keys in French: ${Object.keys(frFlat).length}`);
  console.log(`  - Missing keys: ${missingKeys.length}`);
  console.log(`  - Type inconsistencies: ${inconsistentTypes.length}`);
  console.log(`  - Empty values: ${emptyValues.length}`);

  if (!isValid) {
    process.exit(1);
  }
}

validateTranslations();
