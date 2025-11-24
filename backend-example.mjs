/**
 * Backend Example for CLI Synthesis
 *
 * This file exports a backend that can be synthesized using:
 * atakora synth backend-example.mjs
 */

import { defineBackend, defineSchema, defineAuth, a, c, auth } from './packages/component/dist/index.js';

// Define and export the backend
export const backend = defineBackend({
  schema: defineSchema({
    schema: a.schema({
      // CRUD Models
      User: c.model({
        id: a.id(),
        email: a.string().required().email(),
        name: a.string().required(),
        role: a.enum(['admin', 'user']).default('user'),
        createdAt: a.datetime().required(),
      }),

      Project: c.model({
        id: a.id(),
        name: a.string().required(),
        description: a.string(),
        ownerId: a.string().required(),
        status: a.enum(['active', 'archived']).default('active'),
        createdAt: a.datetime().required(),
      }),
    }),
  }),
  authentication: defineAuth({
    Entra: auth
      .entra()
      .tenant('00000000-0000-0000-0000-000000000000')
      .clientId('11111111-1111-1111-1111-111111111111'),
  }),
  settings: {
    name: 'my-app',
    environment: 'development',
    region: 'eastus',
    organization: 'myorg',
    instance: '01',
    geography: 'eus',
  },
});

// Also export as default
export default backend;

console.log('✅ Backend defined with User and Project models');
