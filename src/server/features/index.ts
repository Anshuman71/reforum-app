import { registerAdminSetup } from './admin-setup/register';

/**
 * Feature registry. Each feature registers its hooks here.
 * Registration order determines FIFO execution order for hooks
 * on the same event.
 *
 * This module is imported as a side-effect (`import '@/server/features'`)
 * in both API entry points. Node module caching ensures it runs exactly once.
 */

registerAdminSetup();
