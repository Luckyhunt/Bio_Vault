import { PUBLIC_CONFIG } from '@/config/env';

/**
 * 🔑 WebAuthn Configuration (Elite Phase 2)
 * Pulls from validated environment layer.
 */

export const rpName = PUBLIC_CONFIG.rpName;
export const rpID = PUBLIC_CONFIG.rpId;
export const origin = PUBLIC_CONFIG.origin;