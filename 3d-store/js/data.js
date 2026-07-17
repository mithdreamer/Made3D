(function () {
  const asset = (path) => `assets/images/${path}`;

  window.ECommerceSeed = {
    settings: {
      siteName: "MAde3D",
      shortName: "MA de",
      phone: "+90 555 123 45 67",
      email: "merhaba@MAde3D.local",
      address: "İzmir, Türkiye",
      adminUsername: "admin",
      adminPassword: "123456",
      heroTitle: "3D baskı ile fikrini ürüne dönüştür",
      heroSubtitle:
        "MAde3D; kişiye özel baskılar, prototip parçalar ve hobi/dekoratif 3D ürünler için modern, yönetilebilir bir mağaza vitrini.",
      aboutImage: "",
      shippingFee: 99,
      freeShippingThreshold: 1500,
      currency: "TRY"
    },
    paymentSettings: {
      enabled: true,
      activeProvider: "iyzico",
      mode: "test",
      methods: {
        creditCard: true,
        bankTransfer: true,
        cashOnDelivery: true
      },
      credentials: {
        merchantId: "",
        apiKey: "",
        secretKey: ""
      },
      callbackUrl: "",
      installments: {
        enabled: true,
        maxCount: 6,
        minAmount: 500
      },
      cardStorage: {
        enabled: false
      },
      bankTransfer: {
        bankName: "MAde3D Demo Bank",
        accountHolder: "MAde3D",
        iban: "TR00 0000 0000 0000 0000 0000 00"
      }
    },
    shippingSettings: {
      defaultCarrier: "yurtici",
      mode: "manual",
      trackingRequired: true,
      customerTrackingVisible: true,
      labelFormat: "a4",
      defaultDesi: 1,
      credentials: {
        apiUsername: "",
        apiPasswordToken: "",
        customerCode: "",
        branchCode: ""
      },
      sender: {
        name: "MAde3D Atölye",
        phone: "+90 555 123 45 67",
        address: "İzmir, Türkiye"
      },
      carriers: [
        {
          id: "yurtici",
          name: "Yurtiçi",
          active: true,
          integrationReady: true,
          trackingUrl: ""
        },
        {
          id: "aras",
          name: "Aras",
          active: true,
          integrationReady: true,
          trackingUrl: ""
        },
        {
          id: "mng",
          name: "MNG / DHL eCommerce",
          active: true,
          integrationReady: true,
          trackingUrl: ""
        },
        {
          id: "ptt",
          name: "PTT",
          active: false,
          integrationReady: true,
          trackingUrl: ""
        },
        {
          id: "ups",
          name: "UPS",
          active: false,
          integrationReady: true,
          trackingUrl: ""
        },
        {
          id: "other",
          name: "Diğer",
          active: false,
          integrationReady: false,
          trackingUrl: ""
        }
      ]
    },
    categories: [
      {
        id: "cat-workspace",
        name: "Çalışma Alanı",
        slug: "calisma-alani",
        description: "Masa düzeni, standlar ve küçük işletme çalışma alanları için 3D baskı ürünler.",
        active: true
      },
      {
        id: "cat-lighting",
        name: "Aydınlatma",
        slug: "aydinlatma",
        description: "Dekoratif abajur, lamba gövdesi ve ortam ışığına uygun tasarımlar.",
        active: true
      },
      {
        id: "cat-prototype",
        name: "Prototip",
        slug: "prototip",
        description: "Mekanik, elektronik ve ürün geliştirme projeleri için fonksiyonel parçalar.",
        active: true
      },
      {
        id: "cat-decor",
        name: "Dekor ve Hobi",
        slug: "dekor-hobi",
        description: "Figür, raf, maket ve hobi köşesi için sıcak dekoratif ürünler.",
        active: true
      },
      {
        id: "cat-personalized",
        name: "Kişiye Özel",
        slug: "kisiye-ozel",
        description: "İsim, logo, ölçü ve renge göre özelleştirilebilen baskılar.",
        active: true
      }
    ],
    products: [
      {
        id: "prd-modul-desk-organizer",
        name: "Modül Masa Organizer",
        slug: "modul-masa-organizer",
        sku: "MAde-ORG-001",
        categoryId: "cat-workspace",
        shortDescription: "Kalem, kart, telefon ve küçük aksesuarlar için modüler masa düzenleyici.",
        description:
          "Birbirine geçen modüllerden oluşan bu organizer, çalışma masasını sade tutmak isteyenler için üretilir. Renk kombinasyonu ve modül dizilimi siparişe göre değiştirilebilir.",
        price: 849,
        oldPrice: 990,
        stock: 18,
        active: true,
        featured: true,
        images: [asset("product-modul-desk-organizer.svg")],
        createdAt: "2026-06-01T09:00:00.000Z",
        updatedAt: "2026-06-01T09:00:00.000Z"
      },
      {
        id: "prd-voronoi-lamp-shade",
        name: "Voronoi Abajur Başlığı",
        slug: "voronoi-abajur-basligi",
        sku: "MAde-LGT-014",
        categoryId: "cat-lighting",
        shortDescription: "Organik desenli, LED ampul ile kullanıma uygun dekoratif abajur başlığı.",
        description:
          "Yarı mat PETG ile basılan Voronoi abajur başlığı, sıcak ışığı yumuşatır ve mekana teknik ama samimi bir karakter katar. Desen yoğunluğu ve renk tonu isteğe göre düzenlenebilir.",
        price: 1290,
        oldPrice: 1490,
        stock: 9,
        active: true,
        featured: true,
        images: [asset("product-voronoi-lamp-shade.svg")],
        createdAt: "2026-06-02T09:00:00.000Z",
        updatedAt: "2026-06-02T09:00:00.000Z"
      },
      {
        id: "prd-robotic-prototype-kit",
        name: "Robotik Prototip Kiti",
        slug: "robotik-prototip-kiti",
        sku: "MAde-PRT-022",
        categoryId: "cat-prototype",
        shortDescription: "Servo bağlantısı, sensör kutusu ve motor braketlerinden oluşan deneme seti.",
        description:
          "PETG ve TPU parçaların birlikte kullanıldığı prototip seti; Arduino, Raspberry Pi ve eğitim projelerinde hızlı deneme yapmak için hazırlanır.",
        price: 1890,
        oldPrice: 2150,
        stock: 11,
        active: true,
        featured: true,
        images: [asset("product-robotic-prototype-kit.svg")],
        createdAt: "2026-06-03T09:00:00.000Z",
        updatedAt: "2026-06-03T09:00:00.000Z"
      },
      {
        id: "prd-personal-nameplate",
        name: "Kişisel İsimlik",
        slug: "kisisel-isimlik",
        sku: "MAde-KO-031",
        categoryId: "cat-personalized",
        shortDescription: "Masa, oda kapısı veya hediye kutusu için çift renkli özel isimlik.",
        description:
          "Ad, logo veya kısa marka yazısı ile üretilebilir. Standlı, yapışkanlı veya vida delikli seçeneklerle küçük işletme vitrinleri ve hediyelikler için uygundur.",
        price: 420,
        oldPrice: 520,
        stock: 30,
        active: true,
        featured: false,
        images: [asset("product-personal-nameplate.svg")],
        createdAt: "2026-06-04T09:00:00.000Z",
        updatedAt: "2026-06-04T09:00:00.000Z"
      },
      {
        id: "prd-architectural-model-kit",
        name: "Mimari Maket Seti",
        slug: "mimari-maket-seti",
        sku: "MAde-DEC-044",
        categoryId: "cat-decor",
        shortDescription: "Sunum, hobi ve konsept çalışmalar için parçalı mimari maket üretimi.",
        description:
          "Temiz yüzeyli PLA parçalar, ölçekli taban ve montaja hazır kitle modelleriyle teslim edilir. Mimari sunumlar ve hobi koleksiyonları için özelleştirilebilir.",
        price: 2450,
        oldPrice: 2790,
        stock: 6,
        active: true,
        featured: true,
        images: [asset("product-architectural-model-kit.svg")],
        createdAt: "2026-06-05T09:00:00.000Z",
        updatedAt: "2026-06-05T09:00:00.000Z"
      },
      {
        id: "prd-magnetic-phone-stand",
        name: "Manyetik Telefon Standı",
        slug: "manyetik-telefon-standi",
        sku: "MAde-ORG-052",
        categoryId: "cat-workspace",
        shortDescription: "Kablo kanallı, dikey ve yatay kullanım için kompakt telefon standı.",
        description:
          "PLA+ gövde, manyetik aparat ve kaymaz taban pediyle masada sabit durur. Renk ve açı küçük seri üretim için ayarlanabilir.",
        price: 590,
        oldPrice: 690,
        stock: 24,
        active: true,
        featured: false,
        images: [asset("product-magnetic-phone-stand.svg")],
        createdAt: "2026-06-06T09:00:00.000Z",
        updatedAt: "2026-06-06T09:00:00.000Z"
      },
      {
        id: "prd-wall-mini-shelf",
        name: "Duvar Tipi Mini Raf",
        slug: "duvar-tipi-mini-raf",
        sku: "MAde-DEC-061",
        categoryId: "cat-decor",
        shortDescription: "Anahtar, kulaklık, bitki veya koleksiyon objeleri için dekoratif mini raf.",
        description:
          "PLA Wood görünümü ve gizli vida yatağıyla küçük alanları düzenlemek için tasarlanır. Tekli veya üçlü set olarak üretilebilir.",
        price: 980,
        oldPrice: 1150,
        stock: 14,
        active: true,
        featured: false,
        images: [asset("product-wall-mini-shelf.svg")],
        createdAt: "2026-06-07T09:00:00.000Z",
        updatedAt: "2026-06-07T09:00:00.000Z"
      },
      {
        id: "prd-drone-part-pack",
        name: "Drone Parça Paketi",
        slug: "drone-parca-paketi",
        sku: "MAde-PRT-073",
        categoryId: "cat-prototype",
        shortDescription: "FPV projeleri için kamera braketi, anten tutucu ve ayak parçaları.",
        description:
          "Darbe dayanımı yüksek PETG Carbon karışımıyla basılır. Standart FPV kamera delikleri ve hafifletilmiş gövde formu prototip denemeleri için uygundur.",
        price: 720,
        oldPrice: 880,
        stock: 16,
        active: true,
        featured: false,
        images: [asset("product-drone-part-pack.svg")],
        createdAt: "2026-06-08T09:00:00.000Z",
        updatedAt: "2026-06-08T09:00:00.000Z"
      }
    ],
    orders: [
      {
        id: "ord-demo-MAde3D-1",
        number: "MAde-2026-0001",
        customer: {
          name: "Demo Müşteri",
          email: "demo@musteri.local",
          phone: "+90 555 111 22 33",
          address: "Örnek Mah. Atölye Sok. No: 3",
          city: "İstanbul"
        },
        items: [
          {
            productId: "prd-modul-desk-organizer",
            name: "Modül Masa Organizer",
            quantity: 1,
            price: 849
          },
          {
            productId: "prd-personal-nameplate",
            name: "Kişisel İsimlik",
            quantity: 2,
            price: 420
          }
        ],
        subtotal: 1689,
        shipping: 0,
        total: 1689,
        status: "preparing",
        paymentMethod: "Havale/EFT",
        paymentStatus: "paid",
        paymentProvider: "manual",
        transactionId: "DEMO-MAde-001",
        cargoCompany: "",
        trackingNumber: "",
        trackingUrl: "",
        shipmentStatus: "preparing",
        note: "Demo MAde3D siparişi.",
        createdAt: "2026-06-08T11:30:00.000Z"
      }
    ]
  };
})();
