# Made3D Yapılacaklar Roadmap

Son güncelleme: 3 Ağustos 2026

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
- Genel Renk Yönetimi ve satışa açık/kapalı geçişi tamamlandı.
- Public ürün detayında yalnızca satışa açık renklerin gösterilmesi tamamlandı.
- Seçilen rengin sepete ve sipariş kalemine aktarılması tamamlandı; canlı test bekliyor.
- Ziyaretçi siparişlerinin Supabase `orders` tablosuna kaydedilmesi eklendi; canlı test bekliyor.
- Admin sipariş listesi ve detayına ürün rengi eklendi.

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

### Hedef 2: Public ürün sayfasında renk seçenekleri — kod tamamlandı, canlı test bekliyor

Uygulananlar:

1. Public ürün detay sayfasına `productColorRepository.js` eklendi.
2. Ürüne bağlı renkler `product_colors` ve `color_master` ilişkisiyle alınıyor.
3. Yalnızca `color_master.is_active = true` olan renkler müşteriye gösteriliyor.
4. Renkler ad ve renk örneğiyle kompakt seçenekler halinde sunuluyor.
5. Aktifse ana renk, değilse ilk aktif renk varsayılan seçiliyor.
6. Kullanıcı renkler arasında seçim yapabiliyor ve seçili renk adı güncelleniyor.
7. Tek aktif renk otomatik seçiliyor; hiç renk bağlantısı yoksa renk alanı gösterilmiyor.
8. Ürüne renk bağlı olduğu halde tamamı satışa kapalıysa açıklama gösteriliyor ve sepete ekleme kapatılıyor.

Canlı testte doğrulanacaklar:

1. Birden fazla aktif renk bulunan üründe ana rengin varsayılan gelmesi.
2. Pasif rengin public sayfada görünmemesi.
3. Ana renk pasifse ilk aktif rengin seçilmesi.
4. Bütün bağlı renkler pasifse sepete ekleme butonunun kapanması.
5. Mobil ve masaüstü görünüm.

#### Public renk seçenekleri kabul kriterleri

- Ürüne bağlı aktif renkler doğru ad ve renk örneğiyle görünmeli.
- Pasif renkler müşteriye sunulmamalı.
- Ana renk başlangıçta seçili olmalı.
- Seçilen renk görsel olarak açıkça anlaşılmalı.
- Renkli bir ürün yanlışlıkla renksiz olarak sepete eklenememeli.
- Sayfa yenilenmesi ve farklı ürünlere geçişte önceki ürünün renk seçimi taşınmamalı.

### Hedef 3: Seçilen rengi sepete ve siparişe aktarma — kod tamamlandı, canlı test bekliyor

- Sepet satırı kimliğini `productId + colorCode` birleşimine göre ayır.
- Aynı ürünün farklı renklerinin ayrı sepet satırları olmasını sağla.
- Seçilen renk kodu ve adını sepet satırında göster.
- Sepete ekleme sırasında rengin hâlâ satışa açık olduğunu yeniden doğrula.
- Ardından renk bilgisini sipariş kalemine aktar.

### Hedef 4: Ortak sipariş kaydı — kod tamamlandı, migration ve canlı test bekliyor

- Siparişleri ziyaretçinin yerel tarayıcısı yerine Supabase `orders` tablosuna kaydet.
- Ziyaretçiye yalnızca sipariş oluşturma izni ver; sipariş listesini okutma.
- Admin kullanıcıya siparişleri okuma ve durumlarını güncelleme izni ver.
- Admin listesi ve detayında seçilen ürün rengini göster.
- Renkli üründe renk seçimini hem sepete eklerken hem sipariş oluştururken doğrula.
- `20260803143000_orders_and_guest_checkout.sql` migration'ını Supabase SQL Editor'da çalıştır.

### Hedef 5: Müşteri gözüyle sipariş akışı — kod tamamlandı, canlı test bekliyor

- Sepetteki **Ödemeye geç** ifadesi **Sipariş bilgilerine geç** olarak değiştirildi.
- Checkout ekranı ödeme sayfası olmaktan çıkarılıp **Siparişi tamamla** ekranına dönüştürüldü.
- Resmî ödeme altyapısı açılana kadar çevrim içi ödeme ve ödeme yöntemi seçimi merkezi `PAYMENTS_ENABLED = false` ayarıyla kapatıldı.
- Yeni siparişlerin ödeme durumu zorunlu olarak `pending`, sağlayıcısı `manual` ve açıklaması **Henüz ödeme alınmadı** olacak şekilde sabitlendi.
- İlçe alanı ve tarayıcı otomatik doldurma bilgileri eklendi.
- Müşterinin ürün, renk, adet, toplam ve teslimat bilgilerini kontrol ettiğini onaylaması zorunlu hale getirildi.
- Sipariş düğmesi ilk gönderimde kilitlenerek çift sipariş oluşturma riski azaltıldı.
- Hatalar yalnızca geçici bildirimle değil, form içinde okunabilir biçimde gösteriliyor.
- Başarı ekranından admin bağlantısı ve müşteriye yönelik olmayan admin metni kaldırıldı.
- Başarı ekranına sipariş numarası, ödeme durumu ve renkleri içeren sipariş özeti eklendi.

Canlı testte doğrulanacaklar:

1. Ürün detayında renk seçimi ve sepette renk gösterimi.
2. Sepetten **Sipariş bilgilerine geç** bağlantısıyla doğru ekrana geçiş.
3. Eksik teslimat bilgisi veya onay kutusu olmadan sipariş oluşturulamaması.
4. Sipariş butonuna art arda tıklamanın tek sipariş oluşturması.
5. Başarı ekranında sipariş numarası, ürün, renk, adet ve toplamın doğru görünmesi.
6. Aynı siparişin admin listesi ve detayında müşteri, ilçe, ürün ve renk bilgileriyle görünmesi.
7. Siparişin ödeme durumunun **Henüz ödeme alınmadı / Bekliyor** olması.

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

İlk iş, güncel paketi Supabase migration'ıyla birlikte çalıştırıp müşteri gözüyle ürün detayından admin sipariş detayına kadar uçtan uca canlı test etmektir. Test geçmeden commit/push yapılmayacaktır. Sonraki geliştirme, canlı testte görülen kullanılabilirlik eksiklerine ve sipariş durum yönetimine göre belirlenecektir.

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
