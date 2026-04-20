import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parses JSON from a Response object or string.
 * Prevents "Unexpected end of JSON input" errors.
 */
export async function safeJson<T>(response: Response | string, fallback: T): Promise<T> {
  try {
    if (!response) return fallback;

    let text: string;
    if (typeof response === 'string') {
      text = response;
    } else {
      // Check if response is cloneable and has text method
      try {
        text = await response.text();
      } catch (e) {
        console.warn('safeJson: Could not read response text', e);
        return fallback;
      }
    }

    if (!text || text.trim() === '') {
      return fallback;
    }
    
    const trimmedText = text.trim();
    
    // Check if it's HTML (common error response from regional blocks or network proxies)
    if (trimmedText.startsWith('<!doctype html>') || 
        trimmedText.startsWith('<html') || 
        trimmedText.startsWith('<!DOCTYPE html>') ||
        trimmedText.includes('<html>')) {
       // Silently return fallback for HTML to avoid console noise for network errors
       return fallback;
    }
    
    try {
      return JSON.parse(trimmedText) as T;
    } catch (parseError) {
      // If it looks like it SHOULD be JSON (starts with { or [) but failed to parse
      if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
         console.warn('safeJson: Failed to parse likely JSON string', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          preview: trimmedText.substring(0, 100)
        });
      }
      return fallback;
    }
  } catch (error) {
    console.error('safeJson: Global execution error', error);
    return fallback;
  }
}
