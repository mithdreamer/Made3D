# Site_Architecture

# Sayfa Mimarisi

Bu proje, 3D printer ile üretilen ürünlerin sergileneceği ve satılacağı bir e-ticaret sitesidir.

## 1. Public / Müşteri Tarafı

Müşterinin göreceği sayfalar burada yer alır.

### Ana Sayfa

Dosya:

```txt
public/index.html

# Ürün Yapısı

Bu doküman sitede satılacak 3D baskı ürünlerinin veri yapısını tanımlar.

---

# Temel Ürün Bilgileri

Her ürün aşağıdaki alanlara sahip olacaktır.

## Ürün ID

Amaç:

Ürünü sistem içerisinde benzersiz tanımlamak.

Örnek:

```txt
SPIDER-001


---

Ben senin önceki web sitesi ve 3D planlarını düşününce ürünleri baştan **3 kategoriye ayırmanın** çok mantıklı olduğunu düşünüyorum:

```txt
1. Hazır Ürünler
   (figürler, dekorasyon ürünleri)

2. Kişiselleştirilebilir Ürünler
   (isimlik, led lamba, anahtarlık)

3. Baskı Hizmeti
   (müşteri STL yükler, sen basarsın)