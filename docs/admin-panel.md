# 04 Admin Panel

Nasıl kullanılır?
Admin girişi için: login.html
Demo kimlik bilgileri:
E-posta: admin@3dstore.local
Şifre: 1234
Girişten sonra:
dashboard.html → özet sayfası
products-admin.html → ürün ekle/düzenle/sil
orders-admin.html → checkout sipariş listesi
customers-admin.html → iletişim formu mesajları
Ürün görselleri nasıl değişir?
Ürün veri modeline artık image alanı eklenebilir.
app.js içindeki Store.productVisual(product) artık:
product.image varsa gerçek <img> gösterir
yoksa eski CSS tabanlı görselle devam eder
Mesaj takibi nasıl oluyor?
contact.html form gönderimleri:
app.js tarafından yakalanır
tarayıcı localStorage içine kaydedilir
admin panelde customers-admin.html sayfasında görüntülenir
Önemli not
Bu değişiklikler statik site içinde çalışır:

yönetim paneli localStorage tabanlı demo olarak çalışır
gerçek üretim için backend / sunucu tabanlı kimlik doğrulama ve veri depolama eklemeniz gerekir