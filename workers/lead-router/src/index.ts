import { z } from 'zod';
import { ulid } from 'ulid';

// ---------------------------------------------------------------------------
// Env bindings
// ---------------------------------------------------------------------------
interface Env {
  DB: D1Database;
  RATE_LIMIT: KVNamespace;
  WEBHOOK_AUTOMATION_URL: string;
  WEBHOOK_AUTOMATION_SECRET: string;
  TURNSTILE_SECRET_KEY: string;
  ENVIRONMENT: string;
  MAX_SUBMISSIONS_PER_IP_PER_HOUR: string;
}

// ---------------------------------------------------------------------------
// Disposable email blocklist
// ---------------------------------------------------------------------------
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
]);

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------
const leadSchema = z.object({
  source_page: z.string(),
  source_tool: z.string().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().optional(),
  zip: z.string().regex(/^\d{5}$/).optional(),
  purchase_price_range: z.string().optional(),
  income_range: z.string().optional(),
  credit_range: z.string().optional(),
  down_payment_range: z.string().optional(),
  loan_type_interest: z.string().optional(),
  timeline: z.string().optional(),
  is_first_time_buyer: z.boolean().optional(),
  is_military: z.boolean().optional(),
  consent_to_share: z.boolean().refine((v) => v === true, 'Consent is required'),
  turnstile_token: z.string(),
  honeypot: z.string().max(0, 'Bot detected'),
});

type LeadInput = z.infer<typeof leadSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

/** Strip a phone string to digits. Return normalized +1XXXXXXXXXX or null. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/** Check if the email domain is in the disposable blocklist. */
function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

/** Verify Cloudflare Turnstile token server-side. */
async function verifyTurnstile(
  token: string,
  ip: string,
  secretKey: string,
): Promise<boolean> {
  const formData = new URLSearchParams();
  formData.append('secret', secretKey);
  formData.append('response', token);
  formData.append('remoteip', ip);

  const res = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    },
  );

  const result = (await res.json()) as { success: boolean };
  return result.success;
}

/** HMAC-SHA256 hex signature. */
async function hmacSign(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Rate limiting helpers (KV-backed)
// ---------------------------------------------------------------------------

async function isRateLimited(
  kv: KVNamespace,
  ip: string,
  max: number,
): Promise<boolean> {
  const key = `rate:${ip}`;
  const val = await kv.get(key);
  const count = val ? parseInt(val, 10) : 0;
  return count >= max;
}

async function incrementRateCounter(
  kv: KVNamespace,
  ip: string,
  max: number,
): Promise<void> {
  const key = `rate:${ip}`;
  const val = await kv.get(key);
  const count = val ? parseInt(val, 10) : 0;
  // 3600 seconds = 1 hour TTL
  await kv.put(key, String(count + 1), { expirationTtl: 3600 });
}

// ---------------------------------------------------------------------------
// Worker export
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // Only handle /api/submit
    if (url.pathname !== '/api/submit') {
      return new Response('Not Found', { status: 404 });
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405, origin);
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';
    const userAgent = request.headers.get('User-Agent') ?? '';
    const maxSubmissions = parseInt(env.MAX_SUBMISSIONS_PER_IP_PER_HOUR || '3', 10);

    try {
      // ---- Rate limit check ----
      if (await isRateLimited(env.RATE_LIMIT, ip, maxSubmissions)) {
        return jsonResponse(
          { success: false, error: 'Too many submissions' },
          429,
          origin,
        );
      }

      // ---- Parse & validate body ----
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          { success: false, errors: ['Invalid JSON body'] },
          400,
          origin,
        );
      }

      const parsed = leadSchema.safeParse(body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map(
          (i) => `${i.path.join('.')}: ${i.message}`,
        );
        return jsonResponse({ success: false, errors }, 400, origin);
      }

      const data = parsed.data;

      // ---- Disposable email check ----
      if (isDisposableEmail(data.email)) {
        return jsonResponse(
          { success: false, errors: ['Disposable email addresses are not allowed'] },
          400,
          origin,
        );
      }

      // ---- Phone validation & normalization ----
      let normalizedPhone: string | null = null;
      if (data.phone) {
        normalizedPhone = normalizePhone(data.phone);
        if (!normalizedPhone) {
          return jsonResponse(
            { success: false, errors: ['phone: Must be a valid US phone number'] },
            400,
            origin,
          );
        }
      }

      // ---- Turnstile verification ----
      const turnstileOk = await verifyTurnstile(
        data.turnstile_token,
        ip,
        env.TURNSTILE_SECRET_KEY,
      );
      if (!turnstileOk) {
        return jsonResponse(
          { success: false, errors: ['Turnstile verification failed'] },
          400,
          origin,
        );
      }

      // ---- Increment rate counter (valid submission) ----
      await incrementRateCounter(env.RATE_LIMIT, ip, maxSubmissions);

      // ---- Generate lead ID & timestamp ----
      const leadId = ulid();
      const now = Date.now();
      const isoTimestamp = new Date(now).toISOString();

      // ---- Write to D1 leads table ----
      await env.DB.prepare(
        `INSERT INTO leads (
          id, source_page, source_tool, name, email, phone, zip,
          purchase_price_range, income_range, credit_range,
          down_payment_range, loan_type_interest, timeline,
          is_first_time_buyer, is_military, consent_to_share,
          created_at, user_agent
        ) VALUES (
          ?1, ?2, ?3, ?4, ?5, ?6, ?7,
          ?8, ?9, ?10,
          ?11, ?12, ?13,
          ?14, ?15, ?16,
          ?17, ?18
        )`,
      )
        .bind(
          leadId,
          data.source_page,
          data.source_tool ?? null,
          data.name,
          data.email,
          normalizedPhone,
          data.zip ?? null,
          data.purchase_price_range ?? null,
          data.income_range ?? null,
          data.credit_range ?? null,
          data.down_payment_range ?? null,
          data.loan_type_interest ?? null,
          data.timeline ?? null,
          data.is_first_time_buyer ? 1 : 0,
          data.is_military ? 1 : 0,
          data.consent_to_share ? 1 : 0,
          now,
          userAgent,
        )
        .run();

      // ---- Build webhook payload ----
      const webhookPayload = {
        lead_id: leadId,
        timestamp: isoTimestamp,
        source_page: data.source_page,
        source_tool: data.source_tool ?? null,
        consumer: {
          name: data.name,
          email: data.email,
          phone: normalizedPhone,
          zip: data.zip ?? null,
        },
        qualification: {
          purchase_price_range: data.purchase_price_range ?? null,
          income_range: data.income_range ?? null,
          credit_range: data.credit_range ?? null,
          down_payment_range: data.down_payment_range ?? null,
          loan_type_interest: data.loan_type_interest ?? null,
          timeline: data.timeline ?? null,
          is_first_time_buyer: data.is_first_time_buyer ?? null,
          is_military: data.is_military ?? null,
        },
        consent: {
          share_with_partner: true,
          timestamp: isoTimestamp,
        },
        routing_hint: 'round-robin',
      };

      const payloadString = JSON.stringify(webhookPayload);

      // ---- HMAC signature ----
      const signature = await hmacSign(env.WEBHOOK_AUTOMATION_SECRET, payloadString);

      // ---- Dispatch webhook ----
      let webhookStatus = 'success';
      let webhookError: string | null = null;
      try {
        const webhookRes = await fetch(env.WEBHOOK_AUTOMATION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
          },
          body: payloadString,
        });
        if (!webhookRes.ok) {
          webhookStatus = 'failed';
          webhookError = `HTTP ${webhookRes.status}`;
        }
      } catch (err) {
        webhookStatus = 'failed';
        webhookError = err instanceof Error ? err.message : 'Unknown webhook error';
      }

      // ---- Write audit log ----
      await env.DB.prepare(
        `INSERT INTO audit_log (
          id, lead_id, action, status, error, ip, user_agent, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
        .bind(
          ulid(),
          leadId,
          'lead_submitted',
          webhookStatus,
          webhookError,
          ip,
          userAgent,
          now,
        )
        .run();

      // ---- Return success ----
      return jsonResponse({ success: true, lead_id: leadId }, 200, origin);
    } catch (err) {
      // Log to console for Workers dashboard / tail
      console.error('Lead submission error:', err);

      // Best-effort audit log for server errors
      try {
        await env.DB.prepare(
          `INSERT INTO audit_log (
            id, lead_id, action, status, error, ip, user_agent, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
        )
          .bind(
            ulid(),
            null,
            'lead_submission_error',
            'error',
            err instanceof Error ? err.message : 'Unknown error',
            ip,
            userAgent,
            Date.now(),
          )
          .run();
      } catch {
        // If even the audit log fails, just swallow it
      }

      return jsonResponse({ success: false, error: 'Internal error' }, 500, origin);
    }
  },
} satisfies ExportedHandler<Env>;
