# 3D Store

3D baski urunleri icin statik e-ticaret vitrini. Katalog, urun detay, sepet ve checkout akisi JavaScript + localStorage ile calisir.

## Yerelde calistirma

```bash
python -m http.server 8080
```

Sonra tarayicida:

```text
http://localhost:8080/public/index.html
```

## Netlify

Netlify'da GitHub reposunu baglarken:

- Base directory: `3d-store`
- Publish directory: `.`
- Build command: bos birak

Kok `index.html`, siteyi `public/index.html` sayfasina yonlendirir.

## Dosya yapisi

- `public/`: Musteri tarafindaki HTML sayfalari
- `css/`: Ortak tema, layout, urun ve sepet stilleri
- `js/`: Katalog, sepet ve checkout davranislari
- `data/`: Urun ve kategori JSON verisi
- `assets/images/store-hero.png`: Ana sayfa hero gorseli

