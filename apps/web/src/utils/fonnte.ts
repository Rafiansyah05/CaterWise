const FONNTE_ENDPOINT = 'https://api.fonnte.com/send';

export type FonnteResult = { ok: true } | { ok: false; error: string };

export function normalizePhoneNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 9) return null;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

export async function sendWhatsApp(target: string, message: string): Promise<FonnteResult> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    return { ok: false, error: 'FONNTE_TOKEN belum dikonfigurasi' };
  }

  const normalized = normalizePhoneNumber(target);
  if (!normalized) {
    return { ok: false, error: `Nomor WhatsApp tidak valid: ${target}` };
  }

  try {
    const res = await fetch(FONNTE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ target: normalized, message }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return { ok: false, error: `Fonnte membalas status ${res.status}` };
    }

    if (data && data.status === false) {
      return { ok: false, error: String(data.reason || 'Fonnte menolak pengiriman') };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal menghubungi Fonnte' };
  }
}
