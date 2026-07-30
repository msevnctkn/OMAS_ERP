# OMAS ERP Architecture — Sprint 0

## Amaç
Supabase'e bağlı ekran kodunu bir gecede taşımadan, güvenli bir ortak uygulama çekirdeği oluşturmak.

## Namespace
- `OMAS.Runtime`: Kalıcı veritabanından gelen canlı veriler.
- `OMAS.Workspace`: Kullanıcının henüz onaylamadığı taslak veriler.
- `OMAS.Services`: İş kuralları.
- `OMAS.Repositories`: Veri sağlayıcı adaptörleri.
- `OMAS.Events`: Modüller arası olay iletişimi.
- `OMAS.UI`: UI yardımcıları.

## Sprint 0 kapsamı
- Sadece kernel eklendi.
- `window.bhdRawRows` kaldırılmadı veya değiştirilmedi.
- Kategori raporu ve BHD okuyucularına dokunulmadı.
- Veritabanına yazma akışı değiştirilmedi.

## Sonraki sprint
BHD Runtime ile BHD Draft'ın kontrollü ayrılması ve manuel commit butonu.
