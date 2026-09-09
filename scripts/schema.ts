import { z } from 'zod';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CapabilitySchema, DecisionSchema } from '../runtime/schema.js';
mkdirSync('schema', { recursive: true });
for (const [name, schema] of Object.entries({ capability: CapabilitySchema, decision: DecisionSchema })) writeFileSync(`schema/${name}.schema.json`, JSON.stringify(z.toJSONSchema(schema), null, 2) + '\n');
console.log('Exported capability and decision JSON schemas.');
