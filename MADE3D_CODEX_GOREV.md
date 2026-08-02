# Made3D — Görsel Yükleme ve Taşınabilir Yayın Mimarisi

Bu dosyadaki görevi mevcut Made3D deposunda uygula. Önce projeyi ve mevcut değişiklikleri incele; çalışan özellikleri koru. Belirsiz bir noktada tahminde bulunup kalıcı mimari kararı verme. Gerekirse durup kısa ve somut bir soru sor.

## Projenin mevcut durumu

- Site statik HTML, CSS ve JavaScript yapısında.
- Ürünler Supabase PostgreSQL üzerinde tutuluyor.
- Ürün görselleri Cloudflare R2 üzerinde tutuluyor.
- Cloudflare Worker şu anda görsel yükleme ve `/media/...` üzerinden gösterim için kullanılıyor.
- Çalıştığı doğrulanan Worker kök adresi:

  ```text
  https://made3d-upload-service.korhanors.workers.dev
  ```

- `product_images` tablosunda en azından `product_id`, `object_key`, `is_primary` ve görsel meta verileri tutuluyor.
- `storefront_products` görünümü ana görsel için `primary_image_object_key` alanını döndürüyor.
- `js/repositories/productRepository.js`, `object_key` değerini Worker’ın `/media/` adresiyle birleştirerek ana görseli ürün kartında gösterebiliyor.
- Canlı ortamda R2 → Supabase → Worker → ürün kartı zinciri tek bir ana görsel için doğrulandı.
- Admin ürün formunda şu alanlar zaten var:

  ```html
  <input id="imageFiles" type="file" accept="image/*" multiple>
  <input id="productImages" name="productImages" type="hidden" value="[]">
  <div class="image-preview-grid" id="imagePreview"></div>
  <button class="btn btn-outline" id="clearImages" type="button">
    Görselleri temizle
  </button>
  ```

- Mevcut `admin-js/image-upload.js`, görselleri tarayıcıda küçültüyor fakat eski Netlify Function adresine JSON/Base64 gönderiyor:

  ```js
  const UPLOAD_URL = "/.netlify/functions/upload-image";
  ```

- Netlify Function bulunamazsa Base64 verisini yerel görsel gibi kullanıyor. Bu geçici davranış kaldırılmalı; ürün görselleri kalıcı olarak R2’ye kaydedilmeli.

## Ana hedef

Admin panelinden ürün fotoğrafı seçildiğinde kullanıcının Cloudflare veya Supabase panellerine girmesine gerek kalmadan:

1. Ürün Supabase’e kaydedilsin ve ürün kimliği elde edilsin.
2. Seçilen görseller Cloudflare Worker üzerinden R2’ye yüklensin.
3. Worker’ın döndürdüğü `object_key`, gerçek dosya boyutu ve içerik türü gibi bilgiler Supabase `product_images` tablosuna kaydedilsin.
4. İlk görsel ana görsel olsun.
5. Ürün kartında ana görsel, ürün detayında tüm görseller galeri olarak gösterilsin.
6. Sistem Netlify’a bağımlı olmasın; GitHub Pages, Netlify ve ileride özel domain altında mümkün olduğunca yalnızca yapılandırma değişikliğiyle çalışabilsin.

## Önce yapılacak inceleme

Kod değiştirmeden önce aşağıdakileri bul ve kısa bir durum özeti çıkar:

1. `AGENTS.md` veya depo içi başka talimat dosyaları.
2. Git çalışma ağacındaki mevcut kullanıcı değişiklikleri.
3. Admin ürün formunu başlatan dosya ve submit akışı:
   - `admin-js/image-upload.js`
   - `admin-js/product-manager.js`
   - `admin-js/admin-app.js`
   - ilgili HTML dosyaları
4. `ProductRepository.upsertProduct()` sonrasında ürün kimliğinin nasıl döndüğü.
5. `product_images` için mevcut repository/fonksiyon olup olmadığı.
6. Supabase tablo, view, migration ve RLS tanımları.
7. Worker kaynak kodu, `/upload` isteğinin beklediği format ve döndürdüğü gerçek JSON.
8. Worker’ın CORS ayarları ve izin verilen origin listesi.
9. Mevcut Netlify ayarları, GitHub Pages workflow’u ve varsa domain/redirect dosyaları.
10. Ana sayfa, ürün listesi ve ürün detay sayfasının görsel verisini nasıl aldığı.

Worker kaynak kodu bu depoda yoksa, request formatını tahmin ederek entegrasyon yazma. Mevcut Worker sözleşmesini kullanıcıdan veya doğrulanabilir yapılandırmadan iste.

## Uygulama planı

### 1. Ortamdan bağımsız yapılandırma

Tek bir merkezi public runtime yapılandırması oluştur veya mevcut yapıyı buna dönüştür. Örnek alanlar:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "...",
  SUPABASE_ANON_KEY: "...",
  MEDIA_BASE_URL: "https://made3d-upload-service.korhanors.workers.dev/media/",
  UPLOAD_URL: "https://made3d-upload-service.korhanors.workers.dev/upload"
};
```

Kurallar:

- Aynı URL farklı JavaScript dosyalarında tekrarlanmasın.
- Supabase service-role anahtarı, R2 anahtarı veya Cloudflare API token’ı frontend’e kesinlikle konulmasın.
- Supabase anon/publishable anahtarı yalnızca doğru RLS politikalarıyla kullanılsın.
- Worker’a yükleme yalnızca doğrulanmış admin kullanıcısı tarafından yapılabilsin. Mevcut yapı bunu sağlamıyorsa güvenli çözümü uygula veya gerekli backend değişikliğini açıkça belirt.
- Site kök domaine veya alt klasöre yayımlandığında kırılmaması için mümkün olan yerlerde sabit kök yollar (`/js/...`) yerine doğru göreli yollar veya merkezi base-path yaklaşımı kullan.

### 2. R2’ye gerçek dosya yükleme

`admin-js/image-upload.js` dosyasını mevcut Worker sözleşmesine göre güncelle:

- Netlify Function bağımlılığını kaldır.
- Base64’ü kalıcı görselmiş gibi saklayan fallback’i kaldır.
- Tercihen `FormData` ile gerçek dosya/blob gönder; ancak Worker başka format bekliyorsa Worker ve frontend’i birlikte tutarlı hâle getir.
- Desteklenen tipleri açıkça sınırla: JPEG, PNG, WebP ve Worker destekliyorsa AVIF.
- En fazla 6 görsel ve görsel başına 10 MB sınırını hem istemci hem Worker tarafında doğrula.
- Gerekliyse mevcut yeniden boyutlandırmayı koru; dosya uzantısı, `content_type` ve üretilen blob birbiriyle tutarlı olsun.
- Her yüklemede ilerleme veya en azından “yükleniyor/başarılı/hatalı” durumu göster.
- Bir görselin hatası tüm formu sessizce başarılı göstermesin.
- Fonksiyon yalnızca URL dizisi değil, yapılandırılmış sonuç döndürsün:

  ```js
  {
    objectKey,
    src,
    sizeBytes,
    contentType,
    originalName
  }
  ```

- Worker cevabının gerçek alan adlarını merkezi bir eşleme noktasında normalize et.

### 3. Supabase `product_images` katmanı

Görsel veritabanı işlemlerini HTML veya form koduna dağınık biçimde yazma. Ayrı bir repository oluştur veya mevcut repository’yi genişlet:

- `getImagesByProductId(productId)`
- `createProductImages(productId, uploadedImages)`
- `setPrimaryImage(productId, imageId)`
- `updateImageOrder(productId, orderedImageIds)`
- `deleteProductImage(imageId)` veya güvenli soft-delete yaklaşımı

Kayıt alanları mevcut şemaya göre eşlensin. Hedef alanlar:

- `product_id`
- `object_key`
- `size_bytes`
- `content_type`
- `original_name`
- `alt_text`
- `sort_order`
- `is_primary`

Şemada alan eksikse idempotent migration dosyası oluştur. Aynı ürün için tek bir `is_primary = true` kaydını güvenceye al. Mevcut verileri bozma.

RLS politikaları:

- Aktif ürünlerin görselleri storefront tarafından okunabilsin.
- Ekleme, güncelleme ve silme yalnızca admin rolüne sahip oturumlarca yapılabilsin.
- Admin rolünün projede nasıl belirlendiğini mevcut auth yapısından incele; yeni ve paralel bir rol sistemi uydurma.

### 4. Ürün kaydetme akışı

Yeni ürün için önerilen sıra:

1. Form alanlarını doğrula.
2. Ürünü `ProductRepository.upsertProduct()` ile kaydet.
3. Dönen `product.id` ile görselleri Worker’a yükle.
4. Yükleme sonuçlarını `product_images` tablosuna yaz.
5. İlk başarılı görseli ana görsel yap, `sort_order` değerlerini sırayla ata.
6. Tüm işlem tamamlandıktan sonra başarı mesajı göster veya ürün listesine yönlendir.

Kısmi hata politikasını açıkça uygula:

- Ürün kaydolup görsel yükleme başarısız olursa ürünün kaybolduğunu söyleme.
- Kullanıcıya “Ürün kaydedildi, ancak N görsel yüklenemedi” gibi doğru sonuç göster.
- Yeniden deneme imkânı sağla.
- Veritabanı kaydı başarısız olan R2 nesneleri için mümkünse güvenli temizlik yap; yapılamıyorsa orphan nesneleri logla ve raporla.

Mevcut ürün düzenleme ekranında:

- Eski görseller yüklensin.
- Yeni görsel eklenebilsin.
- Ana görsel değiştirilebilsin.
- Görsel silinebilsin.
- Sıralama ilk sürümde butonlarla yapılabilir; sürükle-bırak zorunlu değil.

### 5. Storefront çoklu görsel desteği

- Ürün kartları yalnızca ana görseli kullanmaya devam etsin.
- Ürün detay sayfası tüm görselleri `sort_order` sırasıyla alsın.
- Ana görsel büyük gösterilsin; diğerleri küçük önizleme olarak seçilebilsin.
- Görsel yoksa mevcut placeholder korunsun.
- Kırık URL, yavaş yükleme ve erişilebilir `alt` metni ele alınsın.
- `storefront_products` view tek ana görsel için kullanılabilir; tüm galeri için ayrı sorgu/repository kullan.

### 6. Netlify’dan bağımsız ve özel domaine hazır yayın

Uygulamayı tek bir barındırma sağlayıcısına bağlayan parçaları ayır:

- Site kodu statik ve hosting-agnostic kalsın.
- Netlify yalnızca olası bir yayın hedefi olsun; görsel yükleme Netlify Function’a bağlı olmasın.
- GitHub Pages yayını çalışmaya devam etsin.
- Netlify yapılandırması varsa build/publish klasörü açık ve tekrarlanabilir olsun.
- SPA kullanılmıyorsa gereksiz redirect ekleme. Statik çok sayfalı yapı korunuyorsa tüm linkleri buna göre doğrula.
- Özel domaine geçiş için `docs/DEPLOYMENT.md` oluştur ve şu senaryoları anlat:
  - GitHub Pages üzerinde özel domain
  - Netlify üzerinde özel domain
  - DNS’te apex domain ve `www` alt alanı
  - HTTPS sertifikası
  - canonical URL
  - Supabase Auth redirect URL’leri
  - Cloudflare Worker CORS allowed origins
  - Domain değişince düzenlenecek tekil config alanları
- Gerçek domain henüz belirlenmediği için sahte bir domaini koda sabitleme.
- Aynı domaini aynı anda iki farklı canlı hosting hedefine bağlama. Dokümanda tek “production” hedefi seçilmesi gerektiğini belirt.
- Domain seçilene kadar mevcut canlı adresleri bozma.

### 7. Gelecekteki çoklu admin ve şifre sıfırlamaya hazırlık

Bu görevde tam yönetici yönetim paneli zorunlu değil; fakat mimariyi engelleme:

- Yükleme ve `product_images` yazma yetkisi tek bir hard-coded e-postaya bağlanmasın.
- Mevcut Supabase Auth/admin rolü birden fazla admini destekleyebilecek şekilde kullanılsın.
- Şifre sıfırlamada daha sonra Supabase’in güvenli reset bağlantısı akışı kullanılabilsin.
- Başka adminin şifresini görme veya düz metin şifre saklama yaklaşımı oluşturma.

## Güvenlik gereksinimleri

- Service-role anahtarı frontend’de olmayacak.
- R2 access key ve secret frontend’de olmayacak.
- Worker CORS’u `*` bırakılmayacak; localhost geliştirme adresleri ve yapılandırılmış canlı originler kontrollü kullanılacak.
- Yükleme endpoint’i yalnızca dosya uzantısına güvenmeyecek; MIME/type ve boyutu doğrulayacak.
- Nesne anahtarları kullanıcı dosya adından doğrudan üretilmeyecek; güvenli UUID tabanlı anahtar kullanılacak.
- Kullanıcıdan gelen dosya adı HTML içine kaçışsız basılmayacak.
- Supabase RLS devre dışı bırakılarak çözüm üretilmeyecek.
- Loglara token, Authorization header veya gizli anahtar yazılmayacak.

## Kullanıcı deneyimi

Admin formunda en azından şunlar bulunmalı:

- Çoklu görsel seçimi
- En fazla 6 görsel bilgisi
- Dosya tipi ve boyut uyarısı
- Yükleme önizlemeleri
- Yükleniyor durumu
- Her görsel için hata durumu
- Ana görsel işareti
- Görseli kaldırma
- Kaydet butonunun işlem sırasında tekrar basılmasını engelleme
- İşlem sonunda anlaşılır Türkçe sonuç mesajı

## Test ve doğrulama

Uygulamadan sonra uygun testleri çalıştır ve tarayıcıda şu senaryoları doğrula:

1. Tek görselli yeni ürün.
2. Birden fazla görselli yeni ürün.
3. Görselsiz ürün.
4. Desteklenmeyen dosya tipi.
5. 10 MB üzeri dosya.
6. Aynı formda kısmi yükleme hatası.
7. Mevcut ürüne yeni görsel ekleme.
8. Ana görsel değiştirme.
9. Görsel silme ve sıralama.
10. Ürün kartında yalnızca ana görsel.
11. Ürün detayında galeri.
12. Yetkisiz kullanıcının upload ve Supabase write denemesi.
13. Localhost, mevcut GitHub Pages adresi ve mevcut canlı yayın altında asset/link kontrolleri.
14. Sayfa yenileme ve doğrudan alt sayfa URL’sine gitme.
15. Türkçe karakterlerde bozulma olmadığının kontrolü.

Mümkünse lint/test komutlarını ekle. Otomatik test altyapısı yoksa küçük, proje yapısına uygun testler ekle; yalnızca test eklemek için projeyi ağır bir framework’e taşıma.

## Dokümantasyon

Şunları oluştur veya güncelle:

- `docs/IMAGE_UPLOAD_ARCHITECTURE.md`
  - R2 → Worker → Supabase → storefront veri akışı
  - hata senaryoları
  - güvenlik sınırları
- `docs/DEPLOYMENT.md`
  - GitHub Pages, Netlify ve özel domain adımları
  - domain değişim kontrol listesi
- `.env.example` yalnızca gerçekten build ortamı kullanılıyorsa; secret içermesin.
- Gerekli Supabase migration dosyaları.
- Gerekli Worker yapılandırma notları ve örnek CORS origin listesi.

## Çalışma ve Git kuralları

- Kullanıcının mevcut değişikliklerini silme veya üzerine yazma.
- `git reset --hard`, geniş kapsamlı checkout veya benzeri yıkıcı komutlar kullanma.
- Önce mevcut yapıyı analiz et; sonra küçük ve anlaşılır adımlarla uygula.
- Gereksiz framework geçişi yapma. Mevcut vanilla HTML/CSS/JS yapısını koru.
- Gizli anahtarları commit etme.
- Kullanıcının onayı olmadan production deploy, DNS değişikliği, domain bağlantısı veya dış serviste kalıcı ayar değişikliği yapma.
- Kod değişikliklerini ve migration’ları hazırlayıp doğrula; production’a gönderme aşamasında dur ve kullanıcıdan onay iste.

## Beklenen teslim

Görev sonunda:

1. Değiştirilen ve eklenen dosyaları listele.
2. Uygulanan veri akışını kısa biçimde açıkla.
3. Test sonuçlarını belirt.
4. Yapılamayan veya kullanıcıdan bilgi bekleyen konuları açıkça yaz.
5. Supabase SQL veya Worker deploy gibi kullanıcı tarafından manuel uygulanması gereken adımları doğru sırayla ver.
6. Canlıya alınmadan önce gereken environment/origin/redirect ayarlarını kontrol listesi hâlinde sun.
7. Production deploy veya domain değişikliğini kullanıcı onayı olmadan yapma.

## Kabul kriterleri

Görev aşağıdaki koşullarda tamamlanmış sayılır:

- Admin panelinden seçilen görseller R2’ye otomatik yükleniyor.
- Görsel meta verileri Supabase `product_images` tablosuna otomatik yazılıyor.
- Kullanıcı normal ürün ekleme sırasında Cloudflare veya Supabase paneline girmiyor.
- Bir ürüne en fazla 6 görsel eklenebiliyor.
- Tek bir ana görsel tutarlılığı korunuyor.
- Ürün kartı ana görseli, ürün detay sayfası galeriyi gösteriyor.
- Eski Netlify upload Function bağımlılığı kaldırılmış.
- GitHub Pages yayını bozulmamış.
- Netlify ve ileride özel domain için sağlayıcıdan bağımsız yapı ve açık dokümantasyon hazırlanmış.
- Gizli anahtarlar frontend veya repoya eklenmemiş.
- Yetkisiz yükleme/veritabanı yazma denemeleri engellenmiş.

