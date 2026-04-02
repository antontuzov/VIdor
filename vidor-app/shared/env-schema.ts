import { z } from 'zod';

/**
 * Environment variable schema validation
 * Use with Zod for runtime validation of environment variables
 */

export const envSchema = z.object({
  // Backend API URL
  VITE_BACKEND_URL: z.string().url().default('http://localhost:8080'),
  
  // WebSocket URL (derived from backend URL if not specified)
  VITE_WS_URL: z.string().optional(),
  
  // TURN/STUN server for WebRTC NAT traversal
  VITE_TURN_SERVER: z.string().default(''),
  VITE_TURN_USERNAME: z.string().default(''),
  VITE_TURN_PASSWORD: z.string().default(''),
  
  // Qwen Audio API key (optional, falls back to local transcription)
  VITE_QWEN_API_KEY: z.string().optional(),
  
  // JWT secret for token validation (backend only, but included for completeness)
  VITE_JWT_SECRET: z.string().optional(),
  
  // App mode
  VITE_APP_MODE: z.enum(['development', 'production', 'test']).default('development'),
});

export type EnvSchema = z.infer<typeof envSchema>;

/**
 * Validate and return environment variables
 * @throws Error if required variables are missing
 */
export function validateEnv(): EnvSchema {
  const result = envSchema.safeParse({
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
    VITE_TURN_SERVER: import.meta.env.VITE_TURN_SERVER,
    VITE_TURN_USERNAME: import.meta.env.VITE_TURN_USERNAME,
    VITE_TURN_PASSWORD: import.meta.env.VITE_TURN_PASSWORD,
    VITE_QWEN_API_KEY: import.meta.env.VITE_QWEN_API_KEY,
    VITE_JWT_SECRET: import.meta.env.VITE_JWT_SECRET,
    VITE_APP_MODE: import.meta.env.VITE_APP_MODE,
  });

  if (!result.success) {
    console.error('Environment validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

/**
 * Get validated environment or defaults
 */
export function getEnv(): EnvSchema {
  try {
    return validateEnv();
  } catch (e) {
    console.warn('Using default environment configuration');
    return {
      VITE_BACKEND_URL: 'http://localhost:8080',
      VITE_WS_URL: '',
      VITE_TURN_SERVER: '',
      VITE_TURN_USERNAME: '',
      VITE_TURN_PASSWORD: '',
      VITE_QWEN_API_KEY: undefined,
      VITE_JWT_SECRET: undefined,
      VITE_APP_MODE: 'development',
    };
  }
}

/**
 * Get ICE servers configuration
 */
export function getIceServers(): RTCIceServer[] {
  const env = getEnv();
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  
  // Add TURN server if configured
  if (env.VITE_TURN_SERVER && env.VITE_TURN_USERNAME && env.VITE_TURN_PASSWORD) {
    servers.push({
      urls: env.VITE_TURN_SERVER,
      username: env.VITE_TURN_USERNAME,
      credential: env.VITE_TURN_PASSWORD,
    });
  }
  
  return servers;
}

/**
 * Get WebSocket URL
 */
export function getWebSocketUrl(): string {
  const env = getEnv();
  
  if (env.VITE_WS_URL) {
    return env.VITE_WS_URL;
  }
  
  // Derive from backend URL
  const backendUrl = env.VITE_BACKEND_URL;
  try {
    const url = new URL(backendUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws/signaling';
    return url.toString();
  } catch {
    return 'ws://localhost:8080/ws/signaling';
  }
}

/**
 * Get backend API URL
 */
export function getBackendUrl(): string {
  return getEnv().VITE_BACKEND_URL;
}
