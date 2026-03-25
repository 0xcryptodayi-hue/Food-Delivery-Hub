import { db, usersTable, productsTable, categoriesTable, reviewsTable, ordersTable, walletTransactionsTable, hygieneRatingsTable } from "@workspace/db";
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

  const hygieneComments = [
    "Ambalaj çok temiz ve düzgündü, helal olsun!",
    "Yemekler hijyenik paketlenmişti, memnun kaldım.",
    "Temizliğe çok önem veriyor, güven verici.",
    "Tek kullanımlık kaplar kullanılmış, süper.",
    "Gıda güvenliği açısından çok titiz.",
    null, null,
  ];

  const allOrders = await db.select().from(ordersTable);
  for (let i = 0; i < Math.min(allOrders.length, 15); i++) {
    const order = allOrders[i];
    await db.insert(hygieneRatingsTable).values({
      sellerId: order.sellerId,
      buyerId: order.buyerId,
      orderId: order.id,
      score: 3.5 + Math.random() * 1.5,
      comment: hygieneComments[i % hygieneComments.length],
    }).onConflictDoNothing();
  }
  console.log("✅ Hygiene ratings seeded");

  // ── Extra demo buyers (fresh accounts, no reviews/hygiene yet) ──────────────
  const extraBuyers = [
    { name: "Ahmet Yılmaz",   email: "ahmet@demo.com",   phone: "05411111111", address: "Kadıköy, İstanbul",  lat: 40.991, lng: 29.028 },
    { name: "Selin Kaya",     email: "selin@demo.com",    phone: "05422222222", address: "Şişli, İstanbul",    lat: 41.062, lng: 28.990 },
    { name: "Burak Demir",    email: "burak@demo.com",    phone: "05433333333", address: "Üsküdar, İstanbul",  lat: 41.023, lng: 29.015 },
    { name: "Yasemin Çelik",  email: "yasemin@demo.com",  phone: "05444444444", address: "Beşiktaş, İstanbul", lat: 41.044, lng: 29.006 },
  ];

  const extraBuyerIds: number[] = [];
  for (const b of extraBuyers) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, b.email));
    if (existing.length === 0) {
      const [u] = await db.insert(usersTable).values({
        ...b, role: "buyer", isSeller: false, passwordHash: hashPassword("demo123"),
      }).returning();
      extraBuyerIds.push(u.id);
    } else {
      extraBuyerIds.push(existing[0].id);
    }
  }
  console.log("✅ Extra buyers seeded:", extraBuyerIds);

  // ── Extra demo sellers ───────────────────────────────────────────────────────
  const extraSellers = [
    { name: "Halime Hanım",  email: "halime@demo.com",  phone: "05455555555", address: "Bakırköy, İstanbul", lat: 40.980, lng: 28.872, bio: "Ege mutfağını sevenler için zeytinyağlı yemekler ve börekler yapıyorum." },
    { name: "Nurten Abla",   email: "nurten@demo.com",  phone: "05466666666", address: "Maltepe, İstanbul",  lat: 40.934, lng: 29.143, bio: "Karadeniz kökenli, mısır ekmeği ve hamsi böreği konusunda iddialıyım." },
    { name: "Havva Teyze",   email: "havva@demo.com",   phone: "05477777777", address: "Bahçelievler, İstanbul", lat: 41.003, lng: 28.851, bio: "Tatlı işinde 15 yıl tecrübem var. Muhallebi ve Osmanlı tatlılarında uzmanım." },
  ];

  const extraSellerIds: number[] = [];
  for (const s of extraSellers) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, s.email));
    if (existing.length === 0) {
      const [u] = await db.insert(usersTable).values({
        ...s, role: "seller", isSeller: true, passwordHash: hashPassword("demo123"),
        rating: 4.2 + Math.random() * 0.7,
        reviewCount: Math.floor(Math.random() * 30) + 5,
      }).returning();
      extraSellerIds.push(u.id);
    } else {
      extraSellerIds.push(existing[0].id);
    }
  }
  console.log("✅ Extra sellers seeded:", extraSellerIds);

  // ── Products for extra sellers ───────────────────────────────────────────────
  if (extraSellerIds.length > 0) {
    const extraProducts = [
      // Halime Hanım
      { title: "Zeytinyağlı Enginar", description: "Zeytinyağında pişirilmiş, nohutlu taze enginar.", price: 70, category: "sarma", portion: "4 adet", dailyStock: 10, prepTime: 60, sellerId: extraSellerIds[0] },
      { title: "Menemen Böreği", description: "İçinde menemen harcı olan ince yufkalı çıtır börek.", price: 65, category: "borek", portion: "6 dilim", dailyStock: 12, prepTime: 50, sellerId: extraSellerIds[0] },
      { title: "Peynirli Tepsi Böreği", description: "Bol kaşarlı, katmerli el açması tepsi böreği.", price: 80, category: "borek", portion: "8 dilim", dailyStock: 8, prepTime: 80, sellerId: extraSellerIds[0] },
      // Nurten Abla
      { title: "Mısır Ekmeği", description: "Karadeniz usulü, tereyağıyla servis edilen mısır ekmeği.", price: 35, category: "pogaca", portion: "4 dilim", dailyStock: 20, prepTime: 40, sellerId: extraSellerIds[1] },
      { title: "Hamsi Böreği", description: "Taze hamsi ve mısır unundan yapılan Karadeniz böreği.", price: 75, category: "borek", portion: "6 dilim", dailyStock: 8, prepTime: 60, sellerId: extraSellerIds[1] },
      { title: "Fındıklı Kurabiye", description: "Karadeniz fındığıyla hazırlanmış ev yapımı kurabiye.", price: 60, category: "kurabiye", portion: "10 adet", dailyStock: 15, prepTime: 45, sellerId: extraSellerIds[1] },
      // Havva Teyze
      { title: "Muhallebi", description: "Gül suyu ve tarçınla servis edilen klasik muhallebi.", price: 40, category: "dessert", portion: "2 kişilik", dailyStock: 14, prepTime: 30, sellerId: extraSellerIds[2] },
      { title: "Kemal Paşa", description: "Şerbetli, lor peynirli geleneksel Osmanlı tatlısı.", price: 45, category: "dessert", portion: "6 adet", dailyStock: 12, prepTime: 45, sellerId: extraSellerIds[2] },
      { title: "Kadın Göbeği", description: "Şerbetli, ortası delik nefis Osmanlı tatlısı.", price: 50, category: "dessert", portion: "6 adet", dailyStock: 12, prepTime: 50, sellerId: extraSellerIds[2] },
    ];
    for (const p of extraProducts) {
      await db.insert(productsTable).values({
        ...p, remainingStock: p.dailyStock,
        rating: 4.0 + Math.random() * 0.9,
        reviewCount: Math.floor(Math.random() * 20) + 3,
        isSponsored: false,
      }).onConflictDoNothing();
    }
    console.log("✅ Extra seller products seeded");
  }

  // ── Delivered orders for extra buyers (no ratings yet — ready for testing) ───
  const allProductsForOrders = await db.select().from(productsTable);
  for (let bi = 0; bi < extraBuyerIds.length; bi++) {
    const bId = extraBuyerIds[bi];
    // Each extra buyer gets delivered orders from all 5 original sellers + extra sellers
    const targetSellerIds = [...sellerIds, ...extraSellerIds];
    for (let si = 0; si < targetSellerIds.length; si++) {
      const sId = targetSellerIds[si];
      const sellerProducts = allProductsForOrders.filter(p => p.sellerId === sId);
      if (sellerProducts.length === 0) continue;
      const product = sellerProducts[bi % sellerProducts.length];
      // Check if already has an order from this seller
      const existingOrder = await db.select({ id: ordersTable.id }).from(ordersTable)
        .where(eq(ordersTable.buyerId, bId))
        .limit(100);
      const alreadyOrdered = existingOrder.some(() => false); // just insert, onConflict will skip
      await db.insert(ordersTable).values({
        status: "delivered",
        totalAmount: product.price + 15,
        deliveryFee: 15,
        platformFee: product.price * 0.1,
        sellerAmount: product.price * 0.9,
        paymentMethod: "cash",
        deliveryAddress: "İstanbul",
        estimatedTime: 45,
        buyerId: bId,
        sellerId: sId,
        items: [{ productId: product.id, productTitle: product.title, price: product.price, quantity: 1, imageUrl: product.imageUrl }],
        statusHistory: [
          { status: "received", timestamp: new Date(Date.now() - 86400000 * (si + 1)).toISOString() },
          { status: "delivered", timestamp: new Date(Date.now() - 86400000 * si).toISOString() },
        ],
      });
    }
  }
  console.log("✅ Extra buyer orders seeded (no ratings — ready for testing)");

  console.log("🎉 Seed complete!");
  console.log("Demo accounts (all password: demo123):");
  console.log("  Alıcılar : buyer@demo.com | ahmet@demo.com | selin@demo.com | burak@demo.com | yasemin@demo.com");
  console.log("  Satıcılar: ayse@demo.com | fatma@demo.com | zeynep@demo.com | elif@demo.com | meryem@demo.com");
  console.log("             halime@demo.com | nurten@demo.com | havva@demo.com");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
