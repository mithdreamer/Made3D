# Made3D Yapılacaklar Roadmap

Son güncelleme: 2 Ağustos 2026

Bu dosya, Made3D projesinde tamamlanan işleri, sıradaki geliştirme adımını ve daha sonraki hedefleri takip etmek için hazırlanmıştır.

## 1. Tamamlanan altyapı

- Çoklu ürün görseli altyapısı kuruldu.
- Görsel yükleme Cloudflare Worker ve R2 üzerinden çalışıyor.
- Görsel bilgileri `product_images` tablosunda tutuluyor.
- Ana görsel seçme, sıralama ve silme akışları oluşturuldu.
- Merkezi yapılandırma ve repository katmanları hazırlandı.
- Renk ana listesi `color_master` tablosunda oluşturuldu.
- Ürün–renk ilişkileri `product_colors` tablosunda tutuluyor.

## 2. Tamamlanan feature: ürün renk seçimi ve kaydı

- Yeni ürün ve ürün düzenleme formlarına kompakt renk seçim paneli eklendi.
- Bir ürüne sıfır, bir veya birden fazla renk bağlanabiliyor.
- İlk seçilen renk otomatik olarak ana renk oluyor.
- Ana renk değiştirilebiliyor.
- Ana renk kaldırıldığında kalan ilk renk otomatik ana renk oluyor.
- Panel dışına tıklama ve `Esc` ile kapatma çalışıyor.
- Seçilen renkler ürün kaydından sonra Supabase'e yazılıyor.
- Ürün yeniden açıldığında kayıtlı renkler geri yükleniyor.
- Renk silme, yeniden kaydetme, sıralama ve ana renk bilgileri korunuyor.
- `product_colors` için gerekli RLS yazma politikaları oluşturuldu.

Önerilen tamamlanmış feature commit'i:

```text
feat: complete product color selection and saving
```

## 3. Tamamlanan feature: genel renk satış durumu yönetimi

- Admin menüsüne **Renk Yönetimi** ekranı eklendi.
- `color_master.is_active` alanı üzerinden renkler satışa açılıp kapatılabiliyor.
- Aktif ve pasif renkler admin ekranında birlikte listeleniyor.
- Pasif renkler admin tarafında **Satışa kapalı** etiketiyle gösteriliyor.
- Admin, ürün oluştururken veya düzenlerken aktif/pasif fark etmeksizin bütün renkleri seçebiliyor.
- Bir rengin pasifleştirilmesi mevcut `product_colors` bağlantılarını silmiyor.
- Renk yeniden aktifleştirildiğinde ürüne bağlılığı korunmuş oluyor.
- Adminin pasif renkleri de okuyabilmesi ve satış durumunu değiştirebilmesi için `color_master` RLS politikaları düzeltildi.
- Rengi satışa kapatma testi başarıyla geçti.

### Bu feature için son kontrol

- [ ] Aynı rengi tekrar satışa aç.
- [ ] Sayfayı yenileyip durumun korunduğunu doğrula.
- [ ] Supabase'de `color_master.is_active = true` olduğunu kontrol et.
- [ ] Projedeki `supabase/migrations/20260802193000_color_master_admin_update.sql` dosyasının son çalışan SQL'i içerdiğini doğrula.
- [ ] Commit ve push işlemini tamamla.

Önerilen commit:

```text
feat: add admin color availability management
```

## Temel renk yönetimi kuralı

Admin kataloğu ile müşteri satış seçenekleri birbirinden ayrıdır:

- Admin, ürünlere her rengi bağlayabilir.
- `color_master.is_active`, rengin ürüne bağlanıp bağlanamayacağını değil, o anda müşteriye satılıp satılamayacağını belirler.
- Pasiflik ürün–renk ilişkisini silmez.
- Müşteri yalnızca ürüne bağlı ve satışa açık renkleri görür.
- Pasif bir renk doğrudan veya eski bir sayfa üzerinden sepete eklenememelidir.

## 4. Sıradaki feature: public ürün sayfasında renk seçimi

Şu anda yapılacak bir sonraki geliştirme budur.

### Yapılacaklar

1. Ürün detay sorgusuna `product_colors` ve `color_master` bilgilerini ekle.
2. Yalnızca hem ürüne bağlı hem de `is_active = true` olan renkleri getir.
3. Ürün detay sayfasında renk adı ve renk örneğiyle seçim alanı göster.
4. Ürünün ana rengi satışa açıksa başlangıçta onu seçili getir.
5. Ana renk pasifse satışa açık ilk rengi varsayılan seç.
6. Tek satışa açık renk varsa otomatik seç.
7. Birden fazla renk varsa müşterinin seçim yapabilmesini sağla.
8. Satışa açık renk yoksa renk seçimi yerine anlaşılır bir **Şu anda uygun renk bulunmuyor** mesajı göster ve sepete eklemeyi engelle.
9. Masaüstü ve mobil görünümü test et.

### Kabul kriterleri

- Pasif renkler public ürün sayfasında görünmez.
- Admin panelinde pasif renkler ürüne bağlı kalır ve seçilebilir olmaya devam eder.
- Seçili renk görsel olarak açıkça anlaşılır.
- Renk seçimi ürün sayfası yenilendiğinde doğru başlangıç durumuyla gelir.
- Satışa açık renk bulunmadığında ürün yanlışlıkla sepete eklenemez.
- Konsolda yeni JavaScript veya Supabase hatası oluşmaz.

Önerilen commit:

```text
feat: show available color options on product page
```

## 5. Sonraki feature: seçilen rengi sepete aktarma

- Sepete ekleme sırasında seçili rengin kimliğini ve adını kaydet.
- Aynı ürünün farklı renklerini ayrı sepet satırları olarak değerlendir.
- Sepette seçilen renk bilgisini göster.
- Sepete ekleme anında rengin hâlâ aktif olduğunu tekrar doğrula.
- Pasif veya geçersiz renk ile sepete eklemeyi engelle.

## 6. Sonraki feature: sipariş kaydına renk aktarma

- Sipariş kaleminde seçilen renk bilgisini sakla.
- Admin sipariş ekranında seçilen rengi göster.
- Sipariş geçmişinde renk sonradan pasife alınsa bile siparişteki kayıt korunmalı.
- Veritabanı migration ve RLS gereksinimlerini tamamla.

## 7. Geçici satış dönemi: çevrim içi ödemeyi kapalı tutma

Made3D resmî olarak ödeme almaya hazır hâle gelene kadar sipariş yönetimi ekranındaki çevrim içi ödeme akışı kapalı tutulacaktır.

### Geçici çalışma biçimi

- Müşteri ürünleri seçip sipariş talebi oluşturabilir.
- **Ödemeye Geç** butonu müşteriye gösterilmez veya açıkça devre dışı bırakılır.
- Ödeme sayfası ve ödeme başlatma fonksiyonu yalnızca arayüzden değil, doğrudan bağlantı ve API seviyesinde de engellenir.
- Bu dönemde hiçbir kart bilgisi istenmez, ödeme sağlayıcısına istek gönderilmez ve çevrim içi tahsilat yapılmaz.
- Oluşturulan siparişlerde ödeme durumu **Ödeme alınmadı** olarak tutulur; yanlışlıkla **Ödendi** veya **Ödeme bekleniyor** durumuna geçirilmez.
- Müşteriye, sipariş talebinin alındığını ancak çevrim içi ödemenin henüz aktif olmadığını anlatan kısa bir bilgilendirme gösterilir.

### Teknik yaklaşım

- Ödeme özelliği merkezi bir ayarla yönetilir: örneğin `PAYMENTS_ENABLED = false`.
- Sipariş yönetimi sayfası, ödeme butonu, ödeme rotası ve ödeme başlatma servisi aynı ayarı esas alır.
- Ayar kapalıyken eski veya elle yazılmış bir ödeme bağlantısı da çalışmaz.
- Resmî satış ve ödeme altyapısı hazır olduğunda aynı ayar açılarak ödeme akışı kontrollü biçimde etkinleştirilir.

### Ödemeyi açmadan önce

- [ ] Şirket/vergi ve mesafeli satış gerekliliklerini tamamla.
- [ ] Ödeme sağlayıcısı hesabını üretim kullanımına hazırla.
- [ ] Mesafeli satış sözleşmesi, ön bilgilendirme ve iade/iptal metinlerini yayınla.
- [ ] Gizlilik ve kişisel veri metinlerini kontrol et.
- [ ] Test ve gerçek ödeme ortamlarını birbirinden ayır.
- [ ] Başarılı, başarısız, iptal ve iade senaryolarını test et.
- [ ] Siparişin yalnızca doğrulanmış ödeme bildirimi sonrasında **Ödendi** durumuna geçmesini sağla.

### Kabul kriterleri

- `PAYMENTS_ENABLED = false` iken müşteri çevrim içi ödeme başlatamaz.
- Sipariş talebi oluşturulabiliyorsa ödeme alınmadan doğru durumla kaydedilir.
- Admin ekranı ödenmemiş siparişi açıkça ayırt eder.
- Ödeme kapalıyken hiçbir gizli anahtar veya canlı ödeme çağrısı istemci tarafında bulunmaz.
- Özellik daha sonra kodun farklı yerlerini tek tek değiştirmeden merkezi ayarla açılabilir.

Önerilen commit:

```text
feat: gate checkout until payments are enabled
```

## 8. Kısa vadeli teknik temizlik

- `Inter-*.woff2` dosya yolu kaynaklı 404 hatalarını düzelt.
- `favicon.ico` 404 hatasını düzelt.
- Yeni ürün, ürün düzenleme ve Renk Yönetimi sayfalarında konsol hatası olmadığını doğrula.
- Script sıralarının admin sayfalarında tutarlı olduğunu kontrol et.
- Renk akışları için otomatik testleri genişlet.
- Mobil cihaz ve farklı tarayıcılarda temel yönetim ve alışveriş akışını test et.

## 9. Daha sonraki hedefler

### Yönetim paneli

- Birden fazla admin desteği.
- Admin şifre sıfırlama akışı.
- R2 ve Supabase ekranlarına girmeden görsel yönetimini tamamen admin panelinden yapma.
- Stok, fiyat ve ürün durumu için daha açık doğrulama mesajları.

### Ürün ve varyant sistemi

- Renk dışında malzeme seçeneği.
- Renk/malzeme kombinasyonuna göre varyant.
- Varyant bazlı SKU, stok ve fiyat farkı.
- Belirli renge ait görselleri ilişkilendirme.

### Yayın ve operasyon

- GitHub Pages üretim kontrolü.
- Cloudflare Worker izin verilen origin ayarlarını üretim adresiyle doğrula.
- Alan adı alındığında DNS ve üretim dağıtımını tamamla.
- Yedekleme ve geri alma prosedürü oluştur.
- Resmî ödeme altyapısı hazır olduğunda ödeme özelliğini kontrollü olarak etkinleştir.

## Commit öncesi kontrol listesi

- [ ] VS Code'da tüm dosyaları kaydet.
- [ ] `git status` ile değişen ve yeni dosyaları kontrol et.
- [ ] `.env`, gizli anahtar veya kişisel bilgi eklenmediğini doğrula.
- [ ] İlgili sayfaları `Ctrl + F5` ile açıp test et.
- [ ] Konsolda yeni hata olmadığını kontrol et.
- [ ] `git diff` ile eksik veya istenmeyen değişiklik bulunmadığını doğrula.
- [ ] İlgili migration dosyalarının Supabase'te çalışan son SQL ile aynı olduğunu kontrol et.
- [ ] Mevcut otomatik testleri çalıştır.

## Bir sonraki çalışma oturumu

Önce Genel Renk Yönetimi feature'ının ters yön testi yapılacak: pasif renk yeniden satışa açılacak ve sayfa yenilendikten sonra durumun korunduğu doğrulanacak. Commit/push tamamlandıktan sonra public ürün detay sayfasında yalnızca satışa açık renkleri gösterme ve müşteriye renk seçtirme feature'ına başlanacak.
