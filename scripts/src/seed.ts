import { db, usersTable, productsTable, categoriesTable, reviewsTable, ordersTable, walletTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "homefood-marketplace-secret-2024";
function hashPassword(password: string): string {
  return crypto.createHmac("sha256", JWT_SECRET).update(password).digest("hex");
}

async function seed() {
  console.log("🌱 Seeding database...");

  const categories = [
    { name: "Börek",         slug: "borek",      icon: "🥐", color: "#8B5CF6" },
    { name: "Poğaça",        slug: "pogaca",     icon: "🫓", color: "#F59E0B" },
    { name: "Baklava",       slug: "baklava",    icon: "🍯", color: "#EF4444" },
    { name: "Kurabiye",      slug: "kurabiye",   icon: "🍪", color: "#EC4899" },
    { name: "Sarma/Dolma",   slug: "sarma",      icon: "🌿", color: "#10B981" },
    { name: "İçli Köfte",    slug: "icli-kofte", icon: "🥩", color: "#F97316" },
    { name: "Mantı",         slug: "manti",      icon: "🥟", color: "#3B82F6" },
    { name: "Tatlılar",      slug: "dessert",    icon: "🍮", color: "#F59E0B" },
  ];

  for (const cat of categories) {
    await db.insert(categoriesTable).values(cat).onConflictDoNothing();
  }
  console.log("✅ Categories seeded");

  const sellers = [
    {
      name: "Ayşe Hanım",
      email: "ayse@demo.com",
      phone: "05301234567",
      role: "seller",
      isSeller: true,
      address: "Beşiktaş, İstanbul",
      lat: 41.043,
      lng: 29.003,
      bio: "20 yıldır ev yemekleri yapıyorum. Börek ve poğaçada uzmanım, taze malzemeler kullanıyorum.",
    },
    {
      name: "Fatma Teyze",
      email: "fatma@demo.com",
      phone: "05312345678",
      role: "seller",
      isSeller: true,
      address: "Kadıköy, İstanbul",
      lat: 40.990,
      lng: 29.027,
      bio: "Anadolu mutfağının en güzel tariflerini sizinle paylaşıyorum. Sarma ve dolmada iddialıyım!",
    },
    {
      name: "Zeynep'in Mutfağı",
      email: "zeynep@demo.com",
      phone: "05323456789",
      role: "seller",
      isSeller: true,
      address: "Şişli, İstanbul",
      lat: 41.063,
      lng: 28.987,
      bio: "Osmanlı tatlılarını modern yorumlarla sunuyorum. Baklava ve kadayıfta eşsizim.",
    },
    {
      name: "Elif Abla",
      email: "elif@demo.com",
      phone: "05334567890",
      role: "seller",
      isSeller: true,
      address: "Üsküdar, İstanbul",
      lat: 41.022,
      lng: 29.014,
      bio: "Gaziantep usulü içli köfte ve mantı yapıyorum. Gerçek el açması yufkayla.",
    },
    {
      name: "Meryem Hanım",
      email: "meryem@demo.com",
      phone: "05345678901",
      role: "seller",
      isSeller: true,
      address: "Sarıyer, İstanbul",
      lat: 41.168,
      lng: 29.052,
      bio: "Karadeniz usulü poğaça ve kurabiyelerim çok sevilir. Tereyağı kullanıyorum.",
    },
  ];

  const sellerIds: number[] = [];
  for (const seller of sellers) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, seller.email));
    if (existing.length === 0) {
      const [u] = await db.insert(usersTable).values({
        ...seller,
        passwordHash: hashPassword("demo123"),
        rating: 4.3 + Math.random() * 0.7,
        reviewCount: Math.floor(Math.random() * 80) + 20,
      }).returning();
      sellerIds.push(u.id);
    } else {
      sellerIds.push(existing[0].id);
    }
  }
  console.log("✅ Sellers seeded:", sellerIds);

  const products = [
    // ── Ayşe Hanım (sellerIds[0]) – Börek & Poğaça uzmanı
    { title: "Sigara Böreği", description: "İnce yufkadan çıtır çıtır kızartma sigara böreği, içinde beyaz peynir ve maydanoz.", price: 60, category: "borek", portion: "10 adet", dailyStock: 20, prepTime: 40, sellerId: sellerIds[0], isSponsored: true },
    { title: "Paçanga Böreği", description: "Pastırma, kaşar ve sivri biber dolgulu nefis paçanga böreği.", price: 75, category: "borek", portion: "8 adet", dailyStock: 15, prepTime: 45, sellerId: sellerIds[0] },
    { title: "Su Böreği", description: "Haşlama yufkadan, kat kat beyaz peynirli klasik İstanbul su böreği.", price: 80, category: "borek", portion: "6 dilim", dailyStock: 8, prepTime: 90, sellerId: sellerIds[0] },
    { title: "Kıymalı Börek", description: "Soğan, maydanoz ve baharatlarla hazırlanmış kıymalı açma börek.", price: 70, category: "borek", portion: "6 dilim", dailyStock: 10, prepTime: 60, sellerId: sellerIds[0] },
    { title: "Peynirli Poğaça", description: "Yumuşacık hamurlu, bol beyaz peynirli fırın poğaçası.", price: 45, category: "pogaca", portion: "6 adet", dailyStock: 25, prepTime: 50, sellerId: sellerIds[0] },
    { title: "Zeytinli Poğaça", description: "Siyah zeytin ve kekikle hazırlanmış enfes poğaça.", price: 45, category: "pogaca", portion: "6 adet", dailyStock: 20, prepTime: 50, sellerId: sellerIds[0] },

    // ── Fatma Teyze (sellerIds[1]) – Sarma & Dolma uzmanı
    { title: "Zeytinyağlı Yaprak Sarma", description: "Baldo pirinç, fıstık ve kuşüzümüyle sarılmış nefis zeytinyağlı.", price: 65, category: "sarma", portion: "20 adet", dailyStock: 10, prepTime: 90, sellerId: sellerIds[1], isSponsored: true },
    { title: "Etli Yaprak Sarma", description: "Kıymalı, baharatlı yaprak sarma, kızgın yağla servis.", price: 80, category: "sarma", portion: "15 adet", dailyStock: 8, prepTime: 90, sellerId: sellerIds[1] },
    { title: "Biber Dolması", description: "Baldo pirinç ve nane ile doldurulmuş zeytinyağlı biber dolması.", price: 70, category: "sarma", portion: "10 adet", dailyStock: 10, prepTime: 75, sellerId: sellerIds[1] },
    { title: "Kabak Dolması", description: "İç harç ve kıymayla doldurulmuş fırın kabak dolması.", price: 75, category: "sarma", portion: "8 adet", dailyStock: 8, prepTime: 75, sellerId: sellerIds[1] },
    { title: "Sucuklu Poğaça", description: "İçinde taze sucuk olan çıtır hamurlu poğaça.", price: 55, category: "pogaca", portion: "6 adet", dailyStock: 18, prepTime: 55, sellerId: sellerIds[1] },
    { title: "Ispanaklı Börek", description: "Taze ıspanak ve beyaz peynirli, ince yufkadan tepsi böreği.", price: 65, category: "borek", portion: "6 dilim", dailyStock: 10, prepTime: 70, sellerId: sellerIds[1] },

    // ── Zeynep'in Mutfağı (sellerIds[2]) – Baklava & Tatlı uzmanı
    { title: "Fıstıklı Baklava", description: "Antep fıstığı dolu, ince yufkalı geleneksel Gaziantep baklavası.", price: 120, category: "baklava", portion: "8 dilim", dailyStock: 6, prepTime: 120, sellerId: sellerIds[2], isSponsored: true },
    { title: "Cevizli Baklava", description: "Bol cevizli, şerbetli ev yapımı baklava.", price: 100, category: "baklava", portion: "8 dilim", dailyStock: 8, prepTime: 120, sellerId: sellerIds[2] },
    { title: "Burma Baklava", description: "Yağlı hamur kıyılmış fıstıkla sarılmış Burma baklava.", price: 110, category: "baklava", portion: "6 adet", dailyStock: 8, prepTime: 100, sellerId: sellerIds[2] },
    { title: "Sütlaç", description: "Fırında üzeri kızarmış, kremalı ev yapımı sütlaç.", price: 45, category: "dessert", portion: "2 kişilik", dailyStock: 12, prepTime: 40, sellerId: sellerIds[2] },
    { title: "Kazandibi", description: "Dibinde yakılmış, tarçınlı nefis kazandibi tatlısı.", price: 50, category: "dessert", portion: "2 kişilik", dailyStock: 10, prepTime: 40, sellerId: sellerIds[2] },
    { title: "Revani", description: "İrmik ve limon şerbetiyle ıslatılmış nefis revani.", price: 40, category: "dessert", portion: "4 dilim", dailyStock: 14, prepTime: 50, sellerId: sellerIds[2] },

    // ── Elif Abla (sellerIds[3]) – İçli Köfte & Mantı uzmanı
    { title: "Kızartma İçli Köfte", description: "Kıymalı iç harcıyla dolu, yağda kızartılmış Gaziantep usulü içli köfte.", price: 85, category: "icli-kofte", portion: "10 adet", dailyStock: 12, prepTime: 60, sellerId: sellerIds[3], isSponsored: true },
    { title: "Haşlama İçli Köfte", description: "Soğan ve maydanozlu iç harçlı haşlama içli köfte.", price: 75, category: "icli-kofte", portion: "10 adet", dailyStock: 10, prepTime: 60, sellerId: sellerIds[3] },
    { title: "Fırın İçli Köfte", description: "Fırında pişirilmiş, daha az yağlı hafif içli köfte.", price: 80, category: "icli-kofte", portion: "10 adet", dailyStock: 10, prepTime: 70, sellerId: sellerIds[3] },
    { title: "Kayseri Mantısı", description: "Çok küçük elle açılmış Kayseri mantısı, yoğurt ve tereyağıyla.", price: 90, category: "manti", portion: "2 kişilik", dailyStock: 8, prepTime: 90, sellerId: sellerIds[3] },
    { title: "Sulu Mantı", description: "Kemik suyuyla pişirilmiş nefis sulu mantı.", price: 85, category: "manti", portion: "2 kişilik", dailyStock: 8, prepTime: 80, sellerId: sellerIds[3] },
    { title: "Fırın Mantı", description: "Fırında pişirilip üzerine yoğurt dökülen pratik mantı.", price: 80, category: "manti", portion: "2 kişilik", dailyStock: 10, prepTime: 75, sellerId: sellerIds[3] },

    // ── Meryem Hanım (sellerIds[4]) – Poğaça & Kurabiye uzmanı
    { title: "Tereyağlı Kurabiye", description: "Ağzınızda dağılan tereyağlı, pudra şekerli un kurabiyesi.", price: 55, category: "kurabiye", portion: "12 adet", dailyStock: 20, prepTime: 45, sellerId: sellerIds[4] },
    { title: "Cevizli Kurabiye", description: "Üzerinde ceviz olan, çıtır hamurlu cevizli kurabiye.", price: 60, category: "kurabiye", portion: "12 adet", dailyStock: 18, prepTime: 45, sellerId: sellerIds[4], isSponsored: true },
    { title: "Limonlu Kurabiye", description: "Limon kabuğu rendesiyle hazırlanmış ferahlatıcı kurabiye.", price: 55, category: "kurabiye", portion: "12 adet", dailyStock: 18, prepTime: 45, sellerId: sellerIds[4] },
    { title: "Çikolatalı Kurabiye", description: "Bitter çikolata parçalı yumuşak kurabiye.", price: 65, category: "kurabiye", portion: "10 adet", dailyStock: 15, prepTime: 45, sellerId: sellerIds[4] },
    { title: "Nohut Unu Kurabiyesi", description: "Glutensiz, nohut unundan yapılan sağlıklı kurabiye.", price: 65, category: "kurabiye", portion: "10 adet", dailyStock: 12, prepTime: 50, sellerId: sellerIds[4] },
    { title: "Patatesli Poğaça", description: "Patates dolgulu, yumuşak ve bol tereyağlı poğaça.", price: 50, category: "pogaca", portion: "6 adet", dailyStock: 20, prepTime: 55, sellerId: sellerIds[4] },
    { title: "Kadayıf", description: "Tel kadayıf, ceviz ve şerbetle hazırlanmış geleneksel tatlı.", price: 55, category: "dessert", portion: "4 dilim", dailyStock: 10, prepTime: 50, sellerId: sellerIds[4] },
    { title: "Şekerpare", description: "Badem üstlü, şerbetli klasik Osmanlı tatlısı şekerpare.", price: 45, category: "dessert", portion: "8 adet", dailyStock: 14, prepTime: 50, sellerId: sellerIds[4] },
  ];

  for (const product of products) {
    const { isSponsored, ...rest } = product as typeof product & { isSponsored?: boolean };
    await db.insert(productsTable).values({
      ...rest,
      remainingStock: rest.dailyStock,
      rating: 3.9 + Math.random() * 1.1,
      reviewCount: Math.floor(Math.random() * 40) + 8,
      isSponsored: isSponsored ?? false,
    }).onConflictDoNothing();
  }
  console.log("✅ Products seeded");

  // Demo buyer
  const buyer = await db.insert(usersTable).values({
    name: "Mehmet Alıcı",
    email: "buyer@demo.com",
    phone: "05399999999",
    passwordHash: hashPassword("demo123"),
    role: "buyer",
    isSeller: false,
    address: "Beşiktaş, İstanbul",
    lat: 41.045,
    lng: 29.005,
  }).onConflictDoNothing().returning();

  const buyerId = buyer[0]?.id ?? (await db.select().from(usersTable).where(eq(usersTable.email, "buyer@demo.com")))[0].id;

  const reviewComments = [
    "Harika lezzetler, kesinlikle tekrar sipariş vereceğim!",
    "Ev yemeği tadında, çok memnun kaldım.",
    "Porsiyon büyüklüğü tam istediğim gibi.",
    "Malzemeler taze, yemekler lezzetli.",
    "Zamanında geldi, sıcacık ve nefisti.",
    "Annem gibi pişirmiş, helal olsun!",
    "Fiyat performans açısından çok iyi.",
    "Tekrar sipariş verdim, yine mükemmeldi.",
    "Çok tatlı bir satıcı, teşekkürler!",
    "İstanbul'un en iyi ev yemekleri!",
    "Gerçekten ev yapımı hissi veriyor.",
    "Arkadaşlarıma önerdim, hepsi çok beğendi.",
    "Mükemmel ambalaj, sıcak ulaştı.",
    "Bir dahaki siparişimi sabırsızlıkla bekliyorum!",
  ];

  const allProducts = await db.select().from(productsTable);
  const sampleProducts = allProducts.slice(0, 20);
  for (let i = 0; i < sampleProducts.length; i++) {
    const product = sampleProducts[i];
    const [order] = await db.insert(ordersTable).values({
      status: "delivered",
      totalAmount: product.price + 15,
      deliveryFee: 15,
      platformFee: product.price * 0.1,
      sellerAmount: product.price * 0.9,
      paymentMethod: "cash",
      deliveryAddress: "Beşiktaş, İstanbul",
      estimatedTime: 45,
      buyerId,
      sellerId: product.sellerId,
      items: [{ productId: product.id, productTitle: product.title, price: product.price, quantity: 1, imageUrl: product.imageUrl }],
      statusHistory: [
        { status: "received", timestamp: new Date().toISOString() },
        { status: "delivered", timestamp: new Date().toISOString() },
      ],
    }).returning();

    await db.insert(reviewsTable).values({
      rating: Math.floor(Math.random() * 2) + 4,
      comment: reviewComments[i % reviewComments.length],
      buyerId,
      sellerId: product.sellerId,
      productId: product.id,
      orderId: order.id,
    }).onConflictDoNothing();

    await db.insert(walletTransactionsTable).values({
      sellerId: product.sellerId,
      type: "earning",
      amount: product.price * 0.9,
      description: `Sipariş #${order.id}`,
      orderId: order.id,
    });
  }
  console.log("✅ Orders and reviews seeded");
  console.log("🎉 Seed complete!");
  console.log("Demo accounts (all password: demo123):");
  console.log("  Alıcı  : buyer@demo.com");
  console.log("  Satıcı : ayse@demo.com | fatma@demo.com | zeynep@demo.com | elif@demo.com | meryem@demo.com");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
