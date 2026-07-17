import os

project_name = "3d-store"

folders = [
    "public",
    "admin",
    "css",
    "js",
    "data",
    "assets/images",
    "assets/icons",
    "assets/models",
    "md"
]

files = [
    "README.md",
    "PROJECT_PLAN.md",
    "SITE_ARCHITECTURE.md",
    "ROADMAP.md",

    "public/index.html",
    "public/about.html",
    "public/contact.html",
    "public/products.html",
    "public/product-detail.html",
    "public/cart.html",
    "public/checkout.html",

    "admin/dashboard.html",
    "admin/products-admin.html",
    "admin/orders-admin.html",
    "admin/customers-admin.html",

    "css/variables.css",
    "css/global.css",
    "css/layout.css",
    "css/navbar.css",
    "css/products.css",
    "css/cart.css",
    "css/admin.css",

    "js/app.js",
    "js/products.js",
    "js/cart.js",
    "js/checkout.js",
    "js/admin.js",

    "data/products.json",
    "data/categories.json",
    "data/orders.json",

    "md/01-site-amaci.md",
    "md/02-sayfa-mimarisi.md",
    "md/03-urun-yapisi.md",
    "md/04-admin-panel.md",
    "md/05-sepet-ve-siparis.md",
    "md/06-gelecek-ozellikler.md",
    "md/07-notlar.md"
]

os.makedirs(project_name, exist_ok=True)

for folder in folders:
    os.makedirs(os.path.join(project_name, folder), exist_ok=True)

for file in files:
    file_path = os.path.join(project_name, file)
    with open(file_path, "w", encoding="utf-8") as f:
        if file.endswith(".md"):
            f.write(f"# {os.path.basename(file).replace('.md', '').replace('-', ' ').title()}\n\n")
        elif file.endswith(".html"):
            f.write("""<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Store</title>
</head>
<body>

</body>
</html>
""")
        elif file.endswith(".json"):
            f.write("[]\n")
        else:
            f.write("")

print("3D e-ticaret proje klasör yapısı oluşturuldu.")