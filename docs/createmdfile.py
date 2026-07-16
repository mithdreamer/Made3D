from pathlib import Path


FILES = {
    "07-database.md": """# Database

Bu dosya Made3D projesinin veritabanı yapısını açıklar.

## Tablolar

- products
- categories
- product_images
- users
- orders
- order_items

## Tasarım Kararları

- Ürün kodu benzersiz olmalıdır.
- Kategoriler ileride ayrı bir tablo olarak tutulacaktır.
- Ürün fotoğrafları Supabase Storage içinde saklanacaktır.
- Veritabanında fotoğrafın kendisi yerine URL bilgisi tutulacaktır.

## İlişkiler

Bu bölüm ilerleyen aşamalarda doldurulacaktır.
""",

    "08-api.md": """# API

Bu dosya Made3D projesinde kullanılan API bağlantılarını açıklar.

## Supabase API

Made3D vitrini, ürün bilgilerini Supabase üzerinden okuyacaktır.

## Planlanan İşlemler

- Ürünleri listeleme
- Tek ürün getirme
- Ürün ekleme
- Ürün güncelleme
- Ürün silme
- Fotoğraf yükleme

## Güvenlik

Tarayıcı tarafında yalnızca public anahtar kullanılacaktır.
Service Role anahtarı frontend koduna eklenmeyecektir.
""",

    "09-deployment.md": """# Deployment

Bu dosya Made3D projesinin yayınlama sürecini açıklar.

## Yayın Hattı

GitHub Repository

↓

GitHub Actions

↓

Artifact

↓

GitHub Pages

## Kullanılan Sistemler

- GitHub
- GitHub Actions
- GitHub Pages
- Supabase

## Yayın Hattı Modu

- Kaynak kod ile yayın dosyaları ayrılır.
- Main branch'e bot commit atılmaz.
- Yayın artifact üzerinden yapılır.
- Gereksiz üretilmiş dosyalar Git'e eklenmez.
- Merge conflict riski azaltılır.
""",

    "10-architecture.md": """# Architecture

Bu dosya Made3D projesinin genel sistem mimarisini açıklar.

## Mevcut Mimari

Kullanıcı Tarayıcısı

↓

GitHub Pages

↓

HTML + CSS + JavaScript

## Hedef Mimari

Kullanıcı Tarayıcısı

↓

GitHub Pages

↓

JavaScript

↓

Supabase API

├── Database
├── Storage
└── Authentication

## Admin Akışı

Admin Paneli

↓

Supabase Auth

↓

Ürün Bilgisi

↓

Supabase Database

↓

Ürün Fotoğrafı

↓

Supabase Storage
""",

    "11-learnings.md": """# Learnings

Bu dosya proje sırasında öğrenilen önemli kavramları ve deneyimleri içerir.

## 2026-07-16

### GitHub Pages

- Netlify Free plan limiti nedeniyle GitHub Pages'e geçildi.
- Repository adı değiştiğinde GitHub Pages adresi de değişir.
- Workflow yeni repository adıyla tekrar çalıştırılmalıdır.

### GitHub Actions

- Workflow ile otomatik deploy yapılabilir.
- Artifact tabanlı deploy, main branch'e bot commit atılmasını önler.

### Supabase

- Supabase bilgisayara kurulmak zorunda değildir.
- Cloud üzerinden kullanılabilir.
- Database, Storage ve Authentication servislerini aynı platformda sunar.
""",

    "12-notlar.md": """# Notlar

Bu dosya proje sırasında alınan genel notlar için kullanılır.

## Açık Konular

- Supabase products tablosunun oluşturulması
- Product images bucket kurulumu
- Admin girişi
- Mobil fotoğraf yükleme
- Teknoloji Sözlüğü entegrasyonu
- Ortak Admin Platformu
"""
}


def create_markdown_files() -> None:
    current_directory = Path(__file__).resolve().parent

    created_files = []
    skipped_files = []

    for filename, content in FILES.items():
        file_path = current_directory / filename

        if file_path.exists():
            skipped_files.append(filename)
            continue

        file_path.write_text(content.strip() + "\n", encoding="utf-8")
        created_files.append(filename)

    print("\nİşlem tamamlandı.")

    if created_files:
        print("\nOluşturulan dosyalar:")
        for filename in created_files:
            print(f"  + {filename}")

    if skipped_files:
        print("\nZaten mevcut olduğu için atlanan dosyalar:")
        for filename in skipped_files:
            print(f"  - {filename}")


if __name__ == "__main__":
    create_markdown_files()