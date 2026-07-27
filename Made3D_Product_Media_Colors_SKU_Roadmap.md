# Made3D — Product Media, Colors & SKU Roadmap

**Son güncelleme:** 27 Temmuz 2026  
**Mevcut aşama:** Supabase ürün–görsel bağlantısına geçiş

## Roadmap’in Amacı

Made3D ürün sistemini; çoklu görsel, renk seçimi, otomatik SKU üretimi ve ileride eklenecek malzeme, yüzey efekti, ölçü ve diğer varyantları destekleyen profesyonel ve genişletilebilir bir yapıya taşımak.

Bu roadmap, mevcut genel akışı bozmadan tamamlanan işleri, alınan mimari kararları ve sıradaki geliştirme adımlarını tek bir plan altında toplar.

---

## 1. Mimari Kararlar

- Ürünler, kategoriler, renkler, ürün–renk ilişkileri ve diğer metadata Supabase PostgreSQL’de tutulacak.
- Ürün görsellerinin dosyaları Cloudflare R2 üzerinde saklanacak.
- Supabase’de görsel dosyasının kendisi tutulmayacak.
- Supabase `product_images` tablosunda öncelikle R2 `object_key` değeri ve görsele ilişkin metadata saklanacak.
- Görselin tarayıcıda açılacağı adres, kaydedilen `object_key` kullanılarak Worker’ın `/media/` yolu üzerinden oluşturulacak.
- Görsel yüklemeleri ortak bir Upload Service üzerinden yönetilecek.
- Yükleme servisi olarak Cloudflare Worker kullanılacak.
- R2 bucket doğrudan herkese açık bırakılmayacak; görseller Worker üzerinden sunulacak.
- Renk, yüzey efekti ve malzeme birbirinden ayrı kavramlar olarak modellenecek.
- Sistem içi standart adlar İngilizce, Türkiye sitesindeki gösterim adları Türkçe olacak.
- İlk aşamada ürün seviyesinde renk seçenekleri kullanılacak; gerçek stok varyantı yapısı sonraki aşamada geliştirilecek.

### Çalışan medya akışı

```text
Admin ürün formu
↓
Cloudflare Worker /upload
↓
Cloudflare R2 / products/...
↓
R2 object_key
↓
Supabase product_images
↓
Cloudflare Worker /media/...
↓
Made3D sitesi
```

---

## 2. Veritabanı Yapısı

### 2.1 `color_master`

Temel renklerin standart olarak tutulduğu ana tablo.

Kolonlar:

- `code`
- `name_en`
- `name_tr`
- `hex_code`
- `display_order`
- `is_active`
- `created_at`

Kurallar:

- Renk kodları iki haneli olacak: `01`, `02`, `03`...
- `name_en`, sistem içi standart ad olacak.
- `name_tr`, kullanıcıya gösterilen Türkçe ad olacak.
- `hex_code`, arayüzdeki renk göstergesinde kullanılacak.
- Normal kullanıcılar yalnızca aktif renkleri okuyabilecek.
- Ekleme, güncelleme ve silme işlemleri yalnızca admin yetkisiyle yapılacak.

İlk temel renk listesi:

| Kod | İngilizce | Türkçe | Hex |
|---|---|---|---|
| 01 | Black | Siyah | `#000000` |
| 02 | White | Beyaz | `#FFFFFF` |
| 03 | Red | Kırmızı | `#FF0000` |
| 04 | Blue | Mavi | `#0000FF` |
| 05 | Green | Yeşil | `#008000` |
| 06 | Brown | Kahverengi | `#8B4513` |
| 07 | Yellow | Sarı | `#FFFF00` |
| 08 | Orange | Turuncu | `#FFA500` |
| 09 | Pink | Pembe | `#FFC0CB` |
| 10 | Navy | Lacivert | `#000080` |
| 11 | Purple | Mor | `#800080` |
| 12 | Gray | Gri | `#808080` |
| 13 | Beige | Bej | `#F5F5DC` |
| 14 | Cyan | Camgöbeği | `#00B7EB` |
| 15 | Turquoise | Turkuaz | `#40E0D0` |

**Durum:** Oluşturuldu ve ilk 15 renk eklendi.

---

### 2.2 `finish_master`

Rengin yüzey etkisini ayrı yönetmek için sonraki aşamada oluşturulacak.

Planlanan başlangıç seçenekleri:

- Standard
- Matte
- Silk
- Metallic
- Glitter
- Transparent
- Glow

Örnek:

```text
Base color: Red
Finish: Metallic
Sitedeki görünüm: Metalik Kırmızı
```

Bu nedenle `Yaldızlı Kırmızı`, `Mat Kırmızı` veya `İpek Kırmızı` ayrı temel renk olarak kaydedilmeyecek.

**Durum:** Mimari kararı alındı, henüz oluşturulmadı.

---

### 2.3 `material_master`

Filament türlerinin standart olarak tutulacağı ana tablo.

Planlanan başlangıç seçenekleri:

- PLA
- PETG
- ABS
- ASA
- TPU

Malzeme sistemi renklerden ayrı tutulacak.

**Durum:** Planlandı, henüz oluşturulmadı.

---

### 2.4 `product_colors`

Ürün ile seçilebilir renkler arasındaki ilişkiyi tutar.

Mevcut temel alanlar:

- `product_id`
- `color_code`
- ana renk bilgisi
- renk sıralaması
- `created_at`

İlişkiler:

- `product_id` → `products.id`
- `color_code` → `color_master.code`

Kurallar:

- Aynı ürün–renk ilişkisi ikinci kez eklenemez.
- Bir üründe yalnızca bir ana renk bulunabilir.
- Renkler ürün sayfasında belirlenen sıraya göre gösterilebilir.

**Durum:** Oluşturuldu, ilişkiler ve temel kurallar test edildi.

---

### 2.5 `product_images`

Bir ürüne birden fazla görsel bağlamak için kullanılır.

Doğrulanan veya kullanılacak alanlar:

- `id`
- `product_id`
- `object_key`
- `public_url` — mevcut yapıda varsa geçiş uyumluluğu için değerlendirilecek
- `sort_order`
- `is_cover`
- dosya türü ve boyutu gibi gerekli metadata
- `created_at`

Amaç:

- Bir ürüne birden fazla görsel eklemek
- Kapak görselini belirlemek
- Görselleri sıralamak
- Bir görseli silerken diğerlerini korumak
- R2’deki dosya ile Supabase kaydını `object_key` üzerinden ilişkilendirmek

Kurallar:

- `product_id`, `products.id` alanına bağlı olacak.
- Bir üründe yalnızca bir kapak görseli bulunabilecek.
- Aynı R2 nesnesinin tekrar kaydedilmesi engellenecek.
- Ürün görselleri sorguları uygun indexlerle desteklenmeye devam edecek.

**Durum:** Mevcut tablo, ilişkiler, RLS okuma politikası ve indexler doğrulandı. Gerçek yükleme sonucunun tabloya kaydedilmesi sıradaki aşamalardan biridir.

---

## 3. SKU Standardı

İlk sprintte kullanılacak temel format:

```text
ÜRÜN-KODU-RENK-KODU
```

Örnek:

```text
INF-CUBE-001-01
```

Açıklama:

- `INF-CUBE-001` → ana ürün kodu
- `01` → Siyah

İleride malzeme eklendiğinde:

```text
INF-CUBE-001-01-PLA
```

Kurallar:

- İlk sprintte SKU yalnızca ürün ve renk kodunu içerecek.
- Malzeme, ölçü ve diğer gerçek varyantlar sonraki aşamada eklenecek.
- Boşluk yerine tire kullanılacak.
- SKU üretimi admin formunda otomatik yapılacak.
- Otomatik üretilen SKU için benzersizlik kontrolü uygulanacak.
- Ürün kodu sonradan değiştirilirse mevcut sipariş ve kayıtların etkilenmemesi için SKU değiştirme kuralı ayrıca belirlenecek.

**Durum:** Standart belirlendi, kod uygulaması henüz yapılmadı.

---

## 4. Repository ve Servis Katmanı

Planlanan repository dosyaları:

- `productImageRepository.js`
- `productColorRepository.js`

Planlanan görevler:

- `create`
- `update`
- `delete`
- `getByProduct`
- `reorderImages`
- `setCoverImage`
- `setPrimaryColor`
- ürün renklerini toplu olarak eşitleme

Upload Service’in görevleri:

- Dosyayı Cloudflare Worker’a göndermek
- Dönen `objectKey` değerini almak
- Görsel görüntüleme URL’sini oluşturmak
- Yükleme hatalarını kullanıcıya anlaşılır biçimde göstermek
- Supabase’e yalnızca başarılı yüklemeden sonra kayıt göndermek

Ek teknik kural:

- Ürün kaydı, görsel yüklemesi veya Supabase yazımı başarısız olduğunda R2’de sahipsiz dosya kalmasını önleyecek hata geri alma/temizleme akışı tasarlanacak.

**Durum:** Planlandı, repository bağlantısına henüz geçilmedi.

---

## 5. Cloudflare R2 ve Worker

### R2’de saklanacak içerikler

- Ürün görselleri
- Hakkımızda görseli
- Logo
- Banner
- Gelecekte STL, 3MF, PDF ve diğer indirilebilir dosyalar

### Tamamlanan altyapı

- `made3d-media` adlı R2 bucket hazırlandı.
- `made3d-upload-service` adlı Cloudflare Worker oluşturuldu ve deploy edildi.
- Worker’a `MEDIA_BUCKET` adlı R2 binding eklendi.
- `UPLOAD_SECRET` oluşturuldu.
- Worker’daki örnek kod gerçek yükleme servisi koduyla değiştirildi.
- Yükleme servisine dosya türü kontrolü eklendi.
- Dosya boyutu üst sınırı 10 MB olarak belirlendi.
- JPEG, PNG, WebP ve AVIF türleri desteklendi.
- Yetkisiz yükleme isteğinin `401 Unauthorized` ile reddedildiği doğrulandı.
- Worker üzerinden ilk Infinite Cube görseli R2’ye başarıyla yüklendi.
- Yükleme sonucunda `objectKey`, bucket, MIME türü ve dosya boyutu bilgileri döndürüldü.
- R2’deki dosyanın gerçekten oluştuğu doğrulandı.
- `r2.dev` geliştirme adresindeki bağlantı sorunu nedeniyle Worker’a `/media/products/...` okuma yolu eklendi.
- Görselin Worker `/media/` adresinden tarayıcıda açıldığı doğrulandı.
- `r2.dev` Public Development URL erişimi devre dışı bırakıldı.

### Çalışan test kaydı

```text
Object key:
products/44c4f4ba-0009-477c-bb67-116c42974899.jpg

Worker görüntüleme yolu:
https://made3d-upload-service.korhanors.workers.dev/media/products/44c4f4ba-0009-477c-bb67-116c42974899.jpg
```

Bu kayıt geliştirme testi içindir. Ürünle ilişkilendirilirken gerçek ürün kaydı ve metadata ile Supabase’e yazılacaktır.

### Sonraki teknik iyileştirmeler

- CORS politikasını yalnızca gerekli Made3D origin’lerine göre daraltmak
- Yükleme yetkilendirmesini kalıcı admin oturum yapısıyla bütünleştirmek
- `UPLOAD_SECRET` değerinin tarayıcı tarafındaki koda kesinlikle gömülmemesini sağlamak
- Dosya adlandırma ve ürün klasörleme standardını kesinleştirmek
- Görsel silme endpoint’i ve yetki kontrolü eklemek
- Gerektiğinde görsel yeniden boyutlandırma ve optimizasyon süreci eklemek
- Özel alan adı kullanıldığında medya adresini örneğin `media.made3d...` biçimine taşımak

---

## 6. Güvenlik ve RLS

- Tüm yeni Supabase tablolarında Row Level Security etkinleştirilecek.
- Master tabloların yalnızca aktif kayıtları herkese açık okunabilecek.
- Master tablolarda ekleme, güncelleme ve silme yalnızca admin tarafından yapılabilecek.
- Ürün ilişkili tablolarda mevcut admin rol yapısı kullanılacak.
- `product_colors` ve `product_images` için herkese açık okuma ile admin yazma yetkileri birbirinden ayrılacak.
- Worker yükleme endpoint’i anonim ve anahtarsız yüklemeyi kabul etmeyecek.
- Admin formu doğrudan gizli `UPLOAD_SECRET` taşımayacak.
- Kalıcı yönetim yapısında Worker, doğrulanmış admin isteğini güvenli sunucu tarafı yöntemle kabul edecek.
- Dosya silme işlemi hem R2 nesnesini hem Supabase kaydını kontrollü biçimde ele alacak.

**Durum:** Okuma politikalarının önemli bölümü hazır. Admin kullanıcı yapısı ve yalnızca admine açık yazma politikaları tamamlanacak.

---

## 7. Admin Paneli

### 7.1 Ürün bilgileri

- Ürün adı
- Açıklama
- Fiyat
- Ana ürün kodu
- Kategori ve mevcut diğer ürün alanları
- Supabase `products` tablosuna kayıt

### 7.2 Renk yönetimi

- `color_master` listesinden renk seçme
- Bir ürüne birden fazla renk tanımlama
- Ana renk seçme
- Renklerin gösterim sırasını belirleme
- Renk kaldırma
- Renk kodunu SKU’ya otomatik ekleme

### 7.3 Görsel yönetimi

- Birden fazla dosya seçme
- Yükleme öncesi önizleme
- Worker üzerinden R2’ye yükleme
- Yükleme sonucundaki `objectKey` değerini alma
- `objectKey` ve metadata’yı `product_images` tablosuna kaydetme
- Kapak görseli seçme
- Görsel sıralama
- Görsel silme
- Hatalı veya yarım kalan yüklemelerde anlaşılır hata mesajı gösterme

### 7.4 Kayıt sırası

Planlanan ürün oluşturma akışı:

1. Form verilerini doğrula.
2. Ürünü `products` tablosuna kaydet ve `product_id` değerini al.
3. Seçilen renkleri `product_colors` tablosuna kaydet.
4. Görselleri Worker üzerinden R2’ye yükle.
5. Dönen `objectKey` ve metadata değerlerini `product_images` tablosuna kaydet.
6. Ana renk, kapak görseli ve sıralama kurallarını uygula.
7. İşlem sonucunu kullanıcıya göster.
8. Kısmi başarısızlık durumunda geri alma veya düzeltme akışını çalıştır.

**Durum:** Cloudflare medya altyapısı hazır; admin formu entegrasyonu henüz yapılmadı.

---

## 8. Ürün Detay Sayfası

- Büyük ana görsel
- Küçük önizleme görselleri
- Küçük görsele tıklanınca ana görselin değişmesi
- Ürünün mevcut renklerinin gösterilmesi
- Ana rengin ilk seçenek olarak gösterilmesi
- Renklerin tanımlanan sıraya göre listelenmesi
- Seçilen rengin görsel ve SKU bilgisiyle ilişkilendirilmesi
- Seçilen rengin sepete aktarılması
- Eksik görsel durumunda varsayılan görsel gösterilmesi

**Durum:** Planlandı, uygulama aşamasına geçilmedi.

---

## 9. Ürün Kartları

- Ürün kartlarında yalnızca kapak görseli kullanılacak.
- Kapak görseli yoksa varsayılan görsel gösterilecek.
- Görsel adresi `object_key` kullanılarak Worker `/media/` yolu üzerinden oluşturulacak.
- Kart sorgularında gereksiz tüm görseller çekilmeyecek; yalnızca kapak görseli kullanılacak.

**Durum:** Planlandı, uygulama aşamasına geçilmedi.

---

## 10. Sepet

Sepete şu bilgiler birlikte kaydedilecek:

- Ürün
- `product_id`
- Seçilen renk
- Renk kodu
- İlgili SKU
- Adet
- Gerekliyse seçilen varyantın gösterim bilgisi

Sepette yalnızca kullanıcıya gösterilen renk adı değil, sabit `color_code` ve SKU da saklanacak.

**Durum:** Renk ve SKU entegrasyonu henüz yapılmadı.

---

## 11. Hakkımızda Sayfası

Geçici çözüm:

```text
assets/images/made3d.png
```

Ürün medya entegrasyonu tamamlandıktan sonra Hakkımızda görseli de aynı Upload Service üzerinden yönetilecek. Ürün görselleri tamamlanmadan bu alan genişletilmeyecek.

---

## 12. Uygulama Aşamaları

### Faz 1 — Renk veri modeli

- [x] `products.id` veri tipini doğrula: `uuid`
- [x] Renk kodlama standardını belirle
- [x] İngilizce sistem adı / Türkçe gösterim adı kararını ver
- [x] Renk ve yüzey efektini ayır
- [x] `color_master` tablosunu oluştur
- [x] İlk 15 temel rengi ekle
- [x] `color_master` için RLS’yi etkinleştir
- [x] Aktif renkler için anon ve authenticated SELECT politikasını oluştur
- [x] `product_colors` tablosunu oluştur
- [x] Ürün ve renk foreign key ilişkilerini oluştur
- [x] Tekrarlanan ürün–renk kaydını engelle
- [x] Ürün başına tek ana renk kuralını oluştur
- [x] Infinite Cube üzerinde çoklu renk, ana renk ve sıralama testi yap
- [ ] Admin yazma politikalarını tamamla

### Faz 2 — Görsel veri modeli

- [x] Mevcut `product_images` tablosunu doğrula
- [x] `product_images.product_id` → `products.id` ilişkisini doğrula
- [x] RLS okuma politikasını doğrula
- [x] Ürün başına tek kapak görseli kuralını doğrula
- [x] R2 dosya tekrarını engelleyen indexi doğrula
- [x] Görsel sıralama indexini doğrula
- [ ] `object_key` ve gerekli metadata alanlarının nihai kullanımını kontrol et
- [ ] Test görselini gerçek ürün kaydıyla ilişkilendir

### Faz 3 — Cloudflare R2 ve Worker

- [x] `made3d-media` bucket’ını hazırla
- [x] `made3d-upload-service` Worker’ını oluştur ve deploy et
- [x] `MEDIA_BUCKET` R2 binding’ini ekle
- [x] `UPLOAD_SECRET` oluştur
- [x] Gerçek R2 yükleme kodunu ekle
- [x] Dosya türü ve dosya boyutu kontrollerini ekle
- [x] Yetkisiz yükleme testini yap
- [x] Worker üzerinden ilk test görselini yükle
- [x] R2 nesnesinin oluştuğunu doğrula
- [x] `/media/products/...` görüntüleme yolunu ekle
- [x] Görseli tarayıcıda Worker üzerinden görüntüle
- [x] Sorunlu ve gereksiz `r2.dev` public erişimini kapat
- [ ] Kalıcı admin kimlik doğrulama yöntemini tasarla
- [ ] Görsel silme ve temizlik akışını ekle

### Faz 4 — Supabase ürün–medya bağlantısı

- [ ] Supabase → Table Editor → `products` tablosunun mevcut kolonlarını kontrol et
- [ ] Ürün formundaki alanlarla `products` kolonlarını eşleştir
- [ ] `product_images` tablosunda kullanılacak nihai alanları doğrula
- [ ] Worker’ın döndürdüğü `objectKey` değerini ilgili `product_id` ile kaydet
- [ ] Worker medya URL’sini `object_key` üzerinden oluştur
- [ ] İlk ürünü ürün + renkler + görseller birlikte olacak şekilde kaydet
- [ ] Kısmi hata ve sahipsiz R2 dosyası senaryosunu test et

### Faz 5 — Repository ve admin formu

- [ ] `productColorRepository.js` oluştur
- [ ] `productImageRepository.js` oluştur
- [ ] Renk ekleme, kaldırma, ana renk ve sıralama işlevlerini yaz
- [ ] Görsel ekleme, silme, kapak seçme ve sıralama işlevlerini yaz
- [ ] Admin ürün formuna çoklu renk seçimi ekle
- [ ] Admin ürün formuna ana renk ve renk sıralaması ekle
- [ ] Admin ürün formuna çoklu görsel seçme ve önizleme ekle
- [ ] Formu Worker yükleme servisine bağla
- [ ] Ürün ekleme ve düzenleme akışlarını `product_colors` ve `product_images` tablolarına bağla

### Faz 6 — Site ve sepet

- [ ] Ürün detay sayfasında görsel galerisini oluştur
- [ ] Ürün detay sayfasında renk seçimini göster
- [ ] Ürün kartlarında kapak görselini göster
- [ ] Kapak görseli yoksa varsayılan görseli göster
- [ ] Seçilen rengi sepete aktar
- [ ] Renk kodu ve SKU’yu sepet kaydına ekle
- [ ] İlk SKU üretimini `INF-CUBE-001-01` formatında uygula

### Faz 7 — Test ve yayın hazırlığı

- [ ] Admin yazma yetkilerini test et
- [ ] Yetkisiz kullanıcıların ürün, renk ve görsel değiştiremediğini doğrula
- [ ] Çoklu görsel yükleme ve sıralama testlerini yap
- [ ] Kapak görseli değiştirme testini yap
- [ ] Çoklu renk, ana renk ve SKU testlerini yap
- [ ] Ürün düzenleme ve silme senaryolarını test et
- [ ] Mobil ürün detay sayfasını test et
- [ ] Tüm akışı admin panelinden uçtan uca test et
- [ ] Testler tamamlandıktan sonra değişiklikleri commit et
- [ ] Onay sonrasında push ve yayın işlemlerine geç

### Faz 8 — Sonraki sprintler

- [ ] `material_master` tablosunu oluştur
- [ ] `finish_master` tablosunu oluştur
- [ ] Malzeme ve yüzey efektini gerçek varyant yapısına bağla
- [ ] Ölçü varyantlarını ekle
- [ ] Stok takibini SKU/varyant seviyesine taşı
- [ ] STL, 3MF ve PDF dosya yönetimini ekle
- [ ] Hakkımızda, logo ve banner medya yönetimini admin paneline taşı
- [ ] Görsel optimizasyonu ve özel medya alan adı planını uygula

---

## 13. Tamamlanan Çalışmaların Özeti

- Renk, yüzey efekti ve malzemenin ayrı yönetilmesine karar verildi.
- İngilizce sistem adı ve Türkçe gösterim adı standardı belirlendi.
- `color_master` oluşturuldu ve ilk 15 renk eklendi.
- `product_colors` oluşturuldu ve ürün–renk ilişkileri test edildi.
- Ana renk, renk sıralaması ve tekil ilişki kuralları doğrulandı.
- `product_images` tablosu, ilişkileri, RLS politikası ve indexleri kontrol edildi.
- Cloudflare R2 bucket ve Worker yükleme servisi kuruldu.
- Gizli anahtar olmadan yüklemenin engellendiği test edildi.
- Infinite Cube görseli Worker üzerinden R2’ye başarıyla yüklendi.
- Görselin R2’de oluştuğu doğrulandı.
- `r2.dev` yerine Worker `/media/` görüntüleme yolu geliştirildi.
- R2’deki görsel Worker üzerinden tarayıcıda başarıyla görüntülendi.
- `r2.dev` public geliştirme erişimi kapatıldı.

---

## 14. Sıradaki Adım — Üretim Modunda Buradan Devam

Ara sonrasında **“üretim modu”** denildiğinde başlanacak adım:

```text
Supabase
→ Table Editor
→ products tablosu
→ mevcut kolonların kontrolü
```

Bu kontrolün ardından:

1. Ürün formu alanları `products` tablosuyla eşleştirilecek.
2. `product_images` tablosunda `object_key` ve metadata alanları doğrulanacak.
3. Worker’ın döndürdüğü `objectKey`, ilgili `product_id` ile Supabase’e kaydedilecek.
4. İlk gerçek ürün–renk–görsel bağlantısı uçtan uca test edilecek.

---

## Sprint Sonunda Beklenen Durum

- Bir ürünün birden fazla görseli bulunacak.
- Bir ürünün birden fazla renk seçeneği bulunacak.
- Ana renk ve kapak görseli ayrı ayrı belirlenebilecek.
- Renkler ve görseller sıralanabilecek.
- Görseller güvenli Worker yükleme servisi üzerinden Cloudflare R2’ye gönderilecek.
- Supabase yalnızca `object_key` ve gerekli metadata alanlarını saklayacak.
- Görseller Worker `/media/` yolu üzerinden sitede gösterilecek.
- Renk kodu SKU içinde kullanılacak.
- Renk, yüzey efekti ve malzeme ayrı yönetilecek.
- Ürün detay sayfasında galeri ve renk seçimi çalışacak.
- Ürün kartlarında kapak görseli gösterilecek.
- Seçilen renk ve ilgili SKU sepete aktarılacak.
- Admin yetkileri ve RLS politikaları yazma işlemlerini koruyacak.
- Tüm sistem admin panelinden uçtan uca test edilmiş olacak.
