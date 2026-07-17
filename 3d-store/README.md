# MAde3D

MAde3D, 3D baskı ürünleri için statik e-ticaret demosudur. Ana sayfa, ürün listeleme, ürün detay, sepet, checkout, sipariş başarı sayfası ve localStorage tabanlı admin paneli içerir.

## Yerelde çalıştırma

```bash
python -m http.server 8080
```

Sonra tarayıcıda:

```text
http://localhost:8080/
```

## Admin

```text
http://localhost:8080/admin/
```

Varsayılan giriş:

```text
admin / 123456
```

## Netlify

Netlify'da GitHub reposunu bağlarken:

- Base directory: `3d-store`
- Publish directory: `.`
- Build command: boş bırak

## Dosya yapısı

- `pages/`: Müşteri tarafındaki mağaza sayfaları
- `admin/`: Ürün, kategori, sipariş, ödeme, kargo ve mağaza ayarları
- `admin-js/`: LocalStorage tabanlı admin yöneticileri
- `components/`: Navbar, footer, ürün kartı ve admin sidebar
- `css/`: Ortak tema ve layout stilleri
- `js/`: Seed veri, sepet, ürün, sipariş, ödeme ve kargo davranışları
- `data/`: MAde3D örnek ürün, kategori ve ayar JSON verileri
- `assets/images/store-hero.png`: Ana sayfa hero görseli
