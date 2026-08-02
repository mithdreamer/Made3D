# Made3D Yapılacaklar Roadmap

Son güncelleme: 2 Ağustos 2026

Bu dosya, Made3D projesinde kaldığımız noktayı ve sıradaki işleri unutmamak için hazırlanmıştır. Her çalışma sonunda güncellenmelidir.

## Mevcut durum

### Tamamlananlar

- Çoklu ürün görseli altyapısı kuruldu.
- Görsel yükleme Cloudflare Worker ve R2 üzerinden çalışıyor.
- Görsel bilgileri `product_images` tablosunda tutuluyor.
- Ana görsel seçme, sıralama ve silme akışları oluşturuldu.
- Merkezi yapılandırma ve ilgili repository katmanları hazırlandı.
- Renk ana listesi `color_master` tablosunda oluşturuldu.
- 15 aktif renk Supabase'ten başarıyla okunuyor.
- `productColorRepository.js` oluşturuldu ve tarayıcıda yüklendiği doğrulandı.
- Renk fonksiyonları `Store` katmanına bağlandı:
  - `getActiveColors()`
  - `getProductColors(productId)`
  - `replaceProductColors(productId, colors)`
- Yeni ürün ve ürün düzenleme formlarına renk alanı eklendi.
- Renkler formda görüntüleniyor.
- Birden fazla renk seçilebiliyor.
- İlk seçilen renk otomatik olarak ana renk oluyor.
- Ana renk değiştirilebiliyor; ana renk kaldırılırsa ilk seçili renk ana renk oluyor.
- Geniş renk listesi kompakt, açılır çoklu seçim paneline dönüştürüldü.
- Seçilen renkler etiketler halinde gösteriliyor; yıldızla ana renk değiştirilebiliyor.
- Panel dışına tıklama ve `Esc` ile kapatma davranışı eklendi.
- Seçilen renkler ürün kaydında `product_colors` tablosuna yazılıyor.
- Yeni ürün ve mevcut ürün renklerinin kaydedilmesi Supabase üzerinde doğrulandı.
- `product_colors` için gerekli admin RLS yazma politikaları oluşturuldu.

### Sıradaki hedef 1: Genel Renk Yönetimi ekranı

Admin paneline, `color_master` tablosundaki renklerin merkezi olarak yönetileceği ayrı bir **Renk Yönetimi** ekranı eklenecek. Amaç, ilgili filament geçici olarak bulunmadığında rengi satışa kapatabilmek ve tekrar stok geldiğinde yeniden satışa açabilmektir. `is_active` alanı adminin ürüne renk bağlayabilmesini değil, müşterinin o rengi satın alabilmesini belirleyecektir.

Yapılacaklar:

1. Admin menüsüne **Renk Yönetimi** bağlantısı ekle.
2. Renk kodu, Türkçe/İngilizce ad, renk örneği ve aktiflik durumunu listele.
3. Her renk için aktif/pasif anahtarı ekle.
4. Değişikliği `color_master.is_active` alanına güvenli biçimde kaydet.
5. Aktif ve pasif renkleri filtreleme imkânı ekle.
6. İşlem başarılı/başarısız bildirimlerini göster.
7. Yalnızca yetkili adminlerin değişiklik yapabilmesi için RLS politikalarını doğrula.
8. Yeni ürün ve ürün düzenleme formlarında aktif/pasif ayrımı yapmadan `color_master` içindeki tüm renkleri göster.
9. Admin renk seçim panelinde pasif renkleri de seçilebilir tut; ancak durumlarını küçük bir **Satışa kapalı** rozetiyle belirt.
10. Mevcut ürün düzenlenirken ürüne bağlı pasif renkleri göstermeye ve bağlantılarını korumaya devam et.
11. Bir rengi pasife çekmenin `product_colors` satırlarını silmediğini doğrula.
12. Admin renk sorgusunu `getActiveColors()` yerine tüm renkleri getiren bir fonksiyona (ör. `getAllColors()`) geçir; public sorgularda aktiflik filtresini koru.

#### Genel Renk Yönetimi kabul kriterleri

- Renk pasife alındığında `color_master` kaydı silinmemeli; yalnızca aktiflik durumu değişmeli.
- Aktif ve pasif tüm renkler admin tarafından yeni veya mevcut ürüne bağlanabilmeli.
- Pasif renkler admin panelinde **Satışa kapalı** olarak ayırt edilebilmeli.
- Pasife alınan renge ait mevcut `product_colors` bağlantıları korunmalı.
- Mevcut üründe daha önce seçilmiş pasif renk, yanlışlıkla kaybolmamalı.
- Renk tekrar aktifleştirildiğinde, ürüne önceden bağlıysa müşteriye yeniden otomatik olarak sunulmalı.
- Public tarafta müşteriye yalnızca aktif ve ürüne bağlı renkler sunulmalı.
- Pasif renkler public ürün sayfasında, sepette ve yeni sipariş seçiminde yer almamalı.
- İşlemler yalnızca admin yetkisiyle yapılabilmeli.

### Sıradaki hedef 2: Public ürün sayfasında renk seçenekleri

Şu anda public ürün sayfasında ürünün ana özellikleri görülüyor; `product_colors` bağlantıları müşteriye gösterilmiyor. Genel aktif/pasif mantığı tamamlandıktan sonra ürün detay sayfası renk seçimini destekleyecek.

Yapılacaklar:

1. Ürün detay sorgusuna `product_colors` ve `color_master` verilerini ekle.
2. Yalnızca hem ürüne bağlı hem de `color_master.is_active = true` olan renkleri getir.
3. Renkleri renk örneği ve adıyla kompakt seçenekler halinde göster.
4. Ürünün ana rengini ilk seçili seçenek yap.
5. Kullanıcının başka bir renk seçebilmesini sağla.
6. Üründe renk varsa, seçim yapılmadan sepete eklemeyi engelle.
7. Tek renk varsa otomatik seç; renk yoksa renk alanını hiç gösterme.
8. Seçilen rengi sepet satırına ve daha sonra sipariş kaydına aktaracak veri yapısını hazırla.
9. Mobil ve masaüstü görünümü test et.

#### Public renk seçenekleri kabul kriterleri

- Ürüne bağlı aktif renkler doğru ad ve renk örneğiyle görünmeli.
- Pasif renkler müşteriye sunulmamalı.
- Ana renk başlangıçta seçili olmalı.
- Seçilen renk görsel olarak açıkça anlaşılmalı.
- Renkli bir ürün yanlışlıkla renksiz olarak sepete eklenememeli.
- Sayfa yenilenmesi ve farklı ürünlere geçişte önceki ürünün renk seçimi taşınmamalı.

## Renk sistemi kabul kriterleri

- Bir üründe sıfır, bir veya birden fazla renk seçilebilmeli.
- Renk seçilmişse yalnızca bir tanesi ana renk olmalı.
- İlk renk otomatik ana renk olmalı.
- Ana renk kaldırılırsa kalan ilk renk otomatik ana renk olmalı.
- Yeni ürün kaydında `product_colors` satırları oluşmalı.
- Mevcut üründe kayıtlı renkler ve ana renk doğru yüklenmeli.
- Tekrar kaydetme, eski ilişkileri güvenli biçimde güncellemeli ve mükerrer kayıt oluşturmamalı.
- Renk kaydı başarısız olduğunda kullanıcı yanıltıcı bir başarı mesajı görmemeli.
- Masaüstü ve mobil arayüz gereksiz yer kaplamamalı.
- Admin ürün formlarında tüm renkler seçilebilir olmalı; aktiflik yalnızca müşteri satış seçeneklerini filtrelemeli.

## Renklerden sonra yapılacaklar

### Kısa vadeli teknik temizlik

- `Inter-*.woff2` dosya yolu kaynaklı 404 hatalarını düzelt.
- `favicon.ico` 404 hatasını düzelt.
- Yeni ürün ve ürün düzenleme sayfalarında konsol hatası olmadığını doğrula.
- Script sıralarının iki admin sayfasında aynı olduğunu kontrol et.
- Tüm dosyaları kaydet ve `git diff` üzerinden istenmeyen değişiklikleri kontrol et.
- Mevcut otomatik testleri çalıştır; renk akışı için yeni testler ekle.

### Yönetim paneli — sonraki aşamalar

- Birden fazla admin desteği.
- Admin şifre sıfırlama akışı.
- R2 ve Supabase ekranlarına girmeden görsel yönetimini tamamen admin panelinden yapma.
- Renk adları ve HEX değerlerini ekleme/düzenleme desteği.
- Stok, fiyat ve ürün durumu için daha açık doğrulama mesajları.

### Ürün ve varyant sistemi

- Renk dışında malzeme seçeneği.
- Renk/malzeme kombinasyonuna göre varyant.
- Varyant bazlı SKU.
- Varyant bazlı stok ve fiyat farkı.
- Belirli renge ait görselleri ilişkilendirme.

### Mağaza tarafı

- Sepet satırında seçilen renk/varyant bilgisini göster.
- Sipariş kaydında seçilen varyantı sakla.
- Stok kontrolünü varyant düzeyine taşı.

### Yayın ve operasyon

- GitHub Pages üretim kontrolü.
- Cloudflare Worker izin verilen origin ayarlarını üretim adresiyle doğrula.
- Alan adı alındığında DNS ve üretim dağıtımını tamamla.
- Mobil cihaz ve farklı tarayıcılarda temel alışveriş akışını test et.
- Yedekleme ve geri alma prosedürü oluştur.

## Bir sonraki çalışma oturumu

İlk iş, admin panelinde **Genel Renk Yönetimi** ekranını oluşturmak ve ürün formlarını tüm renkleri gösterecek şekilde güncellemektir. Bu ekran tamamlanıp aktif/pasif davranışı doğrulandıktan sonra public ürün detay sayfasında yalnızca ürüne bağlı ve aktif renklerin gösterilmesine geçilecektir.

## Commit kontrol listesi

Commit atmadan önce:

- [ ] VS Code'da `Ctrl + K`, ardından `S` ile tüm dosyaları kaydet.
- [ ] `git status` ile değişen ve yeni dosyaları kontrol et.
- [ ] Gizli anahtar, `.env` veya kişisel bilgi eklenmediğini doğrula.
- [ ] Yeni ve düzenleme sayfasını `Ctrl + F5` ile aç.
- [ ] Konsolda yeni bir JavaScript hatası olmadığını kontrol et.
- [ ] Renklerin Supabase'ten geldiğini ve seçim davranışının çalıştığını doğrula.
- [ ] `git diff` ile yarım veya yanlış yapıştırılmış kod bulunmadığını kontrol et.
- [ ] Testleri çalıştır.

## Tamamlanan renk seçimi için commit

Kompakt renk seçimi ve `product_colors` kayıt akışı tamamlanıp Supabase üzerinde doğrulandığı için bu aşama tamamlanmış özellik olarak commit edilebilir:

```text
feat: complete product color selection and saving
```
