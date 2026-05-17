type ApiPayload = Record<string, unknown>;

export async function parseApiResponse(
  res: Response,
): Promise<{ data: ApiPayload; ok: boolean }> {
  const text = await res.text();
  if (!text) {
    return {
      ok: false,
      data: {
        error: res.ok
          ? "Sunucu boş yanıt döndü."
          : `Sunucu hatası (${res.status}).`,
      },
    };
  }

  try {
    const data = JSON.parse(text) as ApiPayload;
    return { data, ok: res.ok };
  } catch {
    const preview = text.slice(0, 120).replace(/\s+/g, " ").trim();
    return {
      ok: false,
      data: {
        error: res.ok
          ? "Sunucu yanıtı okunamadı."
          : preview.startsWith("Internal")
            ? "Sunucu hatası. Geliştirme sunucusunu durdurup `npm run dev` ile yeniden başlatın."
            : `Sunucu hatası (${res.status}): ${preview}`,
      },
    };
  }
}
