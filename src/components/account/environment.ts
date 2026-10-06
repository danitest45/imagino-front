import { API_BASE_URL } from '../../lib/config';

// The reduced API intentionally has no signup, profile editing, OAuth or billing.
// Do not fall back to another API for these operations.
export const isAIStaging = API_BASE_URL === 'https://imagino-api-ai-staging.onrender.com';
