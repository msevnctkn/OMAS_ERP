# ÖMAS ERP Veri Saklama Politikası

## Kalıcı veritabanı kayıtları

Aşağıdaki veriler uzun dönem ticari hafıza amacıyla silinmeden saklanır:

- Cariler
- Faturalar
- Fatura kalemleri
- Banka hareketleri
- Ödemeler ve tahsilatlar
- Projeler
- Kategoriler ve eşleştirmeler

## Supabase Storage'da saklanacak dosyalar

Yalnızca hukuki veya ticari kanıt niteliği taşıyan dosyalar saklanır:

- Ödeme dekontları
- Tahsilat makbuzları
- PDF, JPG, JPEG, PNG ve WEBP ödeme ekleri
- Logo ve gerektiğinde ürün/firma görselleri

Ödeme dosyaları `source_type = payment_receipt` olarak kaydedilir.

## Supabase Storage'da saklanmayacak dosyalar

Aşağıdaki dosyalar yalnızca içe aktarma kaynağıdır; Supabase'e yüklenmez:

- Banka ekstresi PDF dosyaları
- Banka ekstresi Excel/CSV dosyaları
- Fatura XML dosyalarının ham kopyaları

Bu dosyalar şirket bilgisayarında veya harici arşivde saklanabilir.

## Temel ilke

> Geçici kaynak dosyası değil, kullanıcının düzenleyip onayladığı nihai ticari veri kalıcıdır.
