/**
 * App initialization. Imported as a side-effect in API entry points.
 * Loads config and registers features. Idempotent via Node module caching.
 */
import { setConfig } from '@/server/lib/config';
import config from '../../reforum.config';

// Load adapter config
setConfig(config);

// Register feature hooks
import '@/server/features';
