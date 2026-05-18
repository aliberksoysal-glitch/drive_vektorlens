# VEKTÖR LENS

Next.js ve Google Drive API ile saha fotoğraflarını işletme klasörlerine yüklemek için mobil uyumlu PWA.

## Kurulum

1. Bağımlılıklar: `npm install`
2. Ortam: `.env.example` dosyasını `.env.local` olarak kopyalayın ve Google OAuth / Drive klasör kimliklerini doldurun.
3. Geliştirme: `npm run dev`

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|-----------|
| `GOOGLE_CLIENT_ID` | OAuth istemci kimliği |
| `GOOGLE_CLIENT_SECRET` | OAuth istemci sırrı |
| `GOOGLE_REFRESH_TOKEN` | Drive erişimi için yenileme jetonu |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI |
| `GOOGLE_DRIVE_FOLDER_ID` | İşletme kök klasörü (Drive klasör ID) |
| `APP_API_KEY` | (İsteğe bağlı) Ayarlanırsa `/api/drive/*` için `X-API-Key` veya `Authorization: Bearer` zorunlu. Tarayıcıdan doğrudan kullanımda genelde boş bırakılır; ek güvenlik için reverse proxy ile başlık eklenebilir. |

## Komutlar

- `npm run dev` — geliştirme sunucusu
- `npm run build` — üretim derlemesi
- `npm run start` — üretim sunucusu
- `npm run lint` — ESLint
- `npm run test` — Vitest birim testleri

## Özellikler

- İşletme seçimi ve tarihli ziyaret klasörü
- İstemci tarafı görsel sıkıştırma (yükleme boyutu sınırına uyum)
- Çoklu fotoğraf yükleme, ilerleme çubuğu ve başarısız dosyaları yeniden deneme
- Drive gezgini: arama, yeniden adlandırma, silme
