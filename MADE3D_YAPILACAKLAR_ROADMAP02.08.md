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
- Seçilen renkler renk örneği ve adıyla etiketler halinde gösteriliyor.
- Etiketlerde yıldızla ana renk seçme ve `×` ile kaldırma davranışı eklendi.
- Panel dışına tıklama ve `Esc` tuşuyla kapatma davranışı eklendi.
- Açılır panel mobil görünümde tek sütuna geçecek şekilde düzenlendi.
- Seçilen renkler ürün kaydından sonra `product_colors` tablosuna yazılacak şekilde kayıt akışına bağlandı.
- Renk kaydı başarısız olduğunda ürünün kaydedildiğini, ancak renklerin tamamlanamadığını belirten uyarı eklendi.
- Yeni ve mevcut ürün renklerinin Supabase'e kaydedilmesi doğrulandı.
- Admin paneline **Renk Yönetimi** ekranı eklendi.
- Renkler `color_master.is_active` üzerinden satışa açılıp kapatılabiliyor.
- Ürün formları aktif/pasif tüm renkleri göstermeye devam ediyor.
- Pasif renkler admin ürün formunda seçilebilir ve **Satışa kapalı** rozetiyle ayırt edilebilir.
- Renk Yönetimi ekranına satış durumu filtresi ve özet sayaçları eklendi.
- `color_master` için admin güncelleme RLS migration'ı hazırlandı.

### Tamamlanan hedef: Genel Renk Yönetimi

Admin, renkleri satışa açıp kapatabilir. Bu işlem yalnızca `color_master.is_active` değerini değiştirir; mevcut `product_colors` bağlantılarını silmez. Admin ürün formunda bütün renkler seçilebilir kalır.

### Sıradaki hedef: Public ürün sayfasında renk seçenekleri

1. Ürüne bağlı renkleri public ürün detayında göster.
2. Yalnızca `is_active = true` olan renkleri müşteriye sun.
3. Ana rengi varsayılan seçili getir.
4. Seçilen rengi sepet satırına taşı.
5. Pasif rengin yeni sepete/siparişe eklenmesini engelle.

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

## Renklerden sonra yapılacaklar

### Kısa vadeli teknik temizlik

- `Inter-*.woff2` dosya yolu kaynaklı 404 hatalarını düzelt.
- `favicon.ico` 404 hatasını düzelt.
- Yeni ürün ve ürün düzenleme sayfalarında konsol hatası olmadığını doğrula.
- Script sıralarının iki admin sayfasında aynı olduğunu kontrol et.
- Tüm dosyaları kaydet ve `git diff` üzerinden istenmeyen değişiklikleri kontrol et.
- Mevcut otomatik testleri çalıştır; renk akışı için yeni testler ekle.

### Yönetim paneli

- Birden fazla admin desteği.
- Admin şifre sıfırlama akışı.
- R2 ve Supabase ekranlarına girmeden görsel yönetimini tamamen admin panelinden yapma.
- Ürün renklerinin yönetim panelinden eklenmesi/pasifleştirilmesi.
- Stok, fiyat ve ürün durumu için daha açık doğrulama mesajları.

### Ürün ve varyant sistemi

- Renk dışında malzeme seçeneği.
- Renk/malzeme kombinasyonuna göre varyant.
- Varyant bazlı SKU.
- Varyant bazlı stok ve fiyat farkı.
- Belirli renge ait görselleri ilişkilendirme.

### Mağaza tarafı

- Ürün detay sayfasında renk seçeneklerini göster.
- Sepete eklemeden önce gerekiyorsa renk seçimini zorunlu tut.
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

İlk iş, Supabase SQL Editor'da `20260802193000_color_master_admin_update.sql` dosyasını çalıştırıp Renk Yönetimi ekranında bir rengi satışa kapatma ve yeniden açma senaryosunu doğrulamaktır. Ardından public ürün detayında aktif renkleri göstermeye geçilecektir.

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

## Bu feature için commit kararı

RLS migration'ı çalıştırılıp satışa aç/kapat testi başarıyla tamamlandıktan sonra önerilen mesaj:

```text
feat: add admin color availability management
```
