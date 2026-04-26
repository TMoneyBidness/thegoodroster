/**
 * GA4 event tracking helpers.
 * Event taxonomy per Architecture brief Section 12.
 *
 * Usage in React components:
 *   import { trackEvent } from '@lib/analytics';
 *   trackEvent('tool_started', { tool_name: 'mortgage-calculator' });
 *
 * Usage in Astro components (inline script):
 *   <script>
 *     window.trackEvent?.('cta_clicked', { cta_location: 'hero', cta_text: 'Take Quiz' });
 *   </script>
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    trackEvent?: (eventName: string, params?: Record<string, unknown>) => void;
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// Expose globally for Astro inline scripts
if (typeof window !== 'undefined') {
  window.trackEvent = trackEvent;
}

// Pre-defined event helpers
export const analytics = {
  toolStarted: (toolName: string) =>
    trackEvent('tool_started', { tool_name: toolName }),

  toolStepCompleted: (toolName: string, stepNumber: number) =>
    trackEvent('tool_step_completed', { tool_name: toolName, step_number: stepNumber }),

  toolCompleted: (toolName: string, completionTimeMs: number) =>
    trackEvent('tool_completed', { tool_name: toolName, completion_time_ms: completionTimeMs }),

  toolEmailCapture: (toolName: string) =>
    trackEvent('tool_email_capture', { tool_name: toolName }),

  quizStarted: (sourcePage: string) =>
    trackEvent('quiz_started', { source_page: sourcePage }),

  quizStep: (stepNumber: number) =>
    trackEvent('quiz_step', { step_number: stepNumber }),

  quizCompleted: (sourcePage: string, hasPhone: boolean) =>
    trackEvent('quiz_completed', { source_page: sourcePage, has_phone: hasPhone }),

  ctaClicked: (location: string, text: string) =>
    trackEvent('cta_clicked', { cta_location: location, cta_text: text }),

  formError: (formName: string, field: string, errorType: string) =>
    trackEvent('form_error', { form_name: formName, field, error_type: errorType }),
} as const;
