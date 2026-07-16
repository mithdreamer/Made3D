# 03 Urun Yapisi

Urunler `data/products.json` dosyasinda tutulur. Her urun, katalog karti ve detay sayfasi icin gereken veriyi ayni kayitta tasir.

## Alanlar

- `id`: Urunun benzersiz kimligi. URL query parametresinde kullanilir.
- `name`: Gorunen urun adi.
- `category`: `data/categories.json` icindeki kategori kimligi.
- `price`, `oldPrice`: Guncel ve eski fiyat.
- `rating`, `stock`: Listeleme ve detay icin yardimci degerler.
- `material`, `finish`, `printTime`, `leadTime`: 3D baski uretim bilgileri.
- `palette`, `shape`: Kodla uretilen urun gorselinin stil siniflari.
- `featured`: Ana sayfada one cikan urun olarak gosterilip gosterilmeyecegi.
- `tags`: Arama metnine dahil edilen etiketler.
- `description`: Kart ve detay aciklamasi.
- `features`: Detay sayfasindaki madde listesi.
- `specs`: Anahtar/deger teknik bilgi listesi.

## Yeni urun ekleme

1. `data/products.json` dosyasina yeni bir obje ekle.
2. `category` alaninin `data/categories.json` icindeki bir kategori id'siyle eslestiginden emin ol.
3. `palette` icin mevcut siniflardan birini kullan: `teal`, `coral`, `sand`, `yellow`, `blue`, `wood`, `violet`, `graphite`.
4. `shape` icin mevcut siniflardan birini kullan: `organizer`, `lamp`, `architecture`, `stand`, `prototype`, `shelf`, `nameplate`, `drone`.

