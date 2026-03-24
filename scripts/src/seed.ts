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
    { name: "Ana Yemek", slug: "main-dish", icon: "🍛", color: "#E8651A" },
    { name: "Çorba", slug: "soup", icon: "🥣", color: "#D63B2F" },
    { name: "Tatlı", slug: "dessert", icon: "🍮", color: "#F47A35" },
    { name: "Kahvaltı", slug: "breakfast", icon: "🥞", color: "#FFA726" },
    { name: "Salata", slug: "salad", icon: "🥗", color: "#4CAF50" },
    { name: "Börek", slug: "pastry", icon: "🥐", color: "#8B5CF6" },
  ];

  for (const cat of categories) {
    await db.insert(categoriesTable).values(cat).onConflictDoNothing();
  }
  console.log("✅ Categories seeded");

  const sellers = [
    { name: "Ayşe Hanım", email: "ayse@demo.com", phone: "05301234567", role: "seller", isSeller: true, address: "Beşiktaş, İstanbul", lat: 41.043, lng: 29.003, bio: "20 yıldır ev yemekleri yapıyorum. Taze malzemeler, sevgi dolu tarifler.", avatar: null },
    { name: "Fatma Teyze", email: "fatma@demo.com", phone: "05312345678", role: "seller", isSeller: true, address: "Kadıköy, İstanbul", lat: 40.990, lng: 29.027, bio: "Anadolu mutfağının en güzel tariflerini sizinle paylaşıyorum.", avatar: null },
    { name: "Zeynep'in Mutfağı", email: "zeynep@demo.com", phone: "05323456789", role: "seller", isSeller: true, address: "Şişli, İstanbul", lat: 41.063, lng: 28.987, bio: "Vegan ve vejetaryen seçeneklerle sağlıklı ev yemekleri.", avatar: null },
    { name: "Elif Abla", email: "elif@demo.com", phone: "05334567890", role: "seller", isSeller: true, address: "Üsküdar, İstanbul", lat: 41.022, lng: 29.014, bio: "Osmanlı mutfağından esinlenen otantik tarifler.", avatar: null },
    { name: "Meryem Hanım", email: "meryem@demo.com", phone: "05345678901", role: "seller", isSeller: true, address: "Sarıyer, İstanbul", lat: 41.168, lng: 29.052, bio: "Karadeniz mutfağının vazgeçilmez lezzetleri.", avatar: null },
  ];

  const sellerIds: number[] = [];
  for (const seller of sellers) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, seller.email));
    if (existing.length === 0) {
      const [u] = await db.insert(usersTable).values({ ...seller, passwordHash: hashPassword("demo123"), rating: 4.5 + Math.random() * 0.5, reviewCount: Math.floor(Math.random() * 50) + 10 }).returning();
      sellerIds.push(u.id);
    } else {
      sellerIds.push(existing[0].id);
    }
  }
  console.log("✅ Sellers seeded:", sellerIds);

  const products = [
    { title: "İmam Bayıldı", description: "Geleneksel patlıcan yemeği, zeytinyağı ve domates sosuyla.", price: 65, category: "main-dish", portion: "2 kişilik", dailyStock: 8, prepTime: 45, sellerId: sellerIds[0] },
    { title: "Mercimek Çorbası", description: "Kırmızı mercimekten yapılan nefis çorba, limon ve kekikle.", price: 35, category: "soup", portion: "1 kişilik", dailyStock: 15, prepTime: 30, sellerId: sellerIds[0] },
    { title: "Sütlü Baklava", description: "İnce yufkalar arasında ceviz ve fıstıkla hazırlanmış tatlı.", price: 85, category: "dessert", portion: "4 dilim", dailyStock: 5, prepTime: 60, sellerId: sellerIds[0] },
    { title: "Kuru Fasulye", description: "Geleneksel kuru fasulye, kuşbaşı etle pişirilmiş.", price: 55, category: "main-dish", portion: "2 kişilik", dailyStock: 10, prepTime: 40, sellerId: sellerIds[1] },
    { title: "Tarhana Çorbası", description: "Yoğurt ve domatesle yapılan ev yapımı tarhana.", price: 30, category: "soup", portion: "1 kişilik", dailyStock: 20, prepTime: 20, sellerId: sellerIds[1] },
    { title: "Su Böreği", description: "Katkat açılmış hamur, beyaz peynir ve maydanozla.", price: 70, category: "pastry", portion: "6 dilim", dailyStock: 6, prepTime: 90, sellerId: sellerIds[1] },
    { title: "Sebzeli Kuskus", description: "Mevsim sebzeleri ve baharatlarla hazırlanmış vegan kuskus.", price: 50, category: "main-dish", portion: "1 kişilik", dailyStock: 12, prepTime: 30, sellerId: sellerIds[2] },
    { title: "Mercimek Köftesi", description: "Maydanoz ve baharatlarla hazırlanmış nefis mercimek köftesi.", price: 45, category: "main-dish", portion: "15 adet", dailyStock: 8, prepTime: 45, sellerId: sellerIds[2] },
    { title: "Sezar Salata", description: "Marul, kruton, parmesan ve özel sos ile.", price: 55, category: "salad", portion: "1 kişilik", dailyStock: 10, prepTime: 15, sellerId: sellerIds[2] },
    { title: "Hünkar Beğendi", description: "Patlıcan beşamel üzerine kuşbaşı etli nefis bir Osmanlı yemeği.", price: 95, category: "main-dish", portion: "2 kişilik", dailyStock: 6, prepTime: 60, sellerId: sellerIds[3], isSponsored: true },
    { title: "Güllaç", description: "Süt ve gülsuyu ile hazırlanmış hafif Osmanlı tatlısı.", price: 40, category: "dessert", portion: "1 kişilik", dailyStock: 10, prepTime: 20, sellerId: sellerIds[3] },
    { title: "Döner Dürüm", description: "El yapımı lavaş ekmeğinde nefis et döner.", price: 75, category: "main-dish", portion: "1 kişilik", dailyStock: 20, prepTime: 15, sellerId: sellerIds[3] },
    { title: "Mısır Ekmeği", description: "Karadeniz usulü mısır unu ile pişirilmiş taze ekmek.", price: 25, category: "breakfast", portion: "6 dilim", dailyStock: 15, prepTime: 45, sellerId: sellerIds[4] },
    { title: "Karalahana Çorbası", description: "Karadeniz'in vazgeçilmezi karalahana çorbası.", price: 35, category: "soup", portion: "1 kişilik", dailyStock: 15, prepTime: 35, sellerId: sellerIds[4] },
    { title: "Kuymak", description: "Mısır unu ve kaşar peyniriyle yapılan Karadeniz kahvaltısı.", price: 55, category: "breakfast", portion: "2 kişilik", dailyStock: 8, prepTime: 25, sellerId: sellerIds[4] },
    { title: "Tavuklu Güveç", description: "Bol sebzeli, fırın güveçte pişirilmiş nefis tavuk.", price: 75, category: "main-dish", portion: "2 kişilik", dailyStock: 8, prepTime: 60, sellerId: sellerIds[0], isSponsored: true },
    { title: "Kaymaklı Ekmek Kadayıfı", description: "Bol şerbetli, kaymaklı geleneksel tatlı.", price: 50, category: "dessert", portion: "2 dilim", dailyStock: 12, prepTime: 30, sellerId: sellerIds[1] },
    { title: "Meze Tabağı", description: "Humus, patlıcan salatası, haydari ve mevsim sebzeleri.", price: 80, category: "salad", portion: "2 kişilik", dailyStock: 10, prepTime: 20, sellerId: sellerIds[3] },
    { title: "Peynirli Börek", description: "Çıtır yufka, taze beyaz peynir ve maydanozla.", price: 60, category: "pastry", portion: "4 dilim", dailyStock: 10, prepTime: 50, sellerId: sellerIds[2] },
    { title: "Kestaneli Pilav", description: "Kavurmalı, kestaneli nefis Osmanlı pilavı.", price: 45, category: "main-dish", portion: "1 kişilik", dailyStock: 12, prepTime: 40, sellerId: sellerIds[4] },
  ];

  for (const product of products) {
    const { isSponsored, ...rest } = product as typeof product & { isSponsored?: boolean };
    await db.insert(productsTable).values({
      ...rest,
      remainingStock: rest.dailyStock,
      rating: 3.8 + Math.random() * 1.2,
      reviewCount: Math.floor(Math.random() * 30) + 5,
      isSponsored: isSponsored ?? false,
    }).onConflictDoNothing();
  }
  console.log("✅ Products seeded");

  const buyer = await db.insert(usersTable).values({
    name: "Mehmet Alıcı", email: "buyer@demo.com", phone: "05399999999",
    passwordHash: hashPassword("demo123"), role: "buyer", isSeller: false,
    address: "Beşiktaş, İstanbul", lat: 41.045, lng: 29.005,
  }).onConflictDoNothing().returning();

  const buyerId = buyer[0]?.id ?? (await db.select().from(usersTable).limit(1))[0].id;

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
    "Lezzet harika ama biraz daha tuz olabilirdi.",
    "Mükemmel ambalaj, sıcak ulaştı.",
    "Bir dahaki siparişimi sabırsızlıkla bekliyorum!",
  ];

  const allProducts = await db.select().from(productsTable).limit(15);
  for (let i = 0; i < 15; i++) {
    const product = allProducts[i % allProducts.length];
    const [order] = await db.insert(ordersTable).values({
      status: "delivered", totalAmount: product.price + 15,
      deliveryFee: 15, platformFee: product.price * 0.1,
      sellerAmount: product.price * 0.9, paymentMethod: "cash",
      deliveryAddress: "Beşiktaş, İstanbul", estimatedTime: 45,
      buyerId, sellerId: product.sellerId,
      items: [{ productId: product.id, productTitle: product.title, price: product.price, quantity: 1, imageUrl: product.imageUrl }],
      statusHistory: [{ status: "received", timestamp: new Date().toISOString() }, { status: "delivered", timestamp: new Date().toISOString() }],
    }).returning();

    await db.insert(reviewsTable).values({
      rating: Math.floor(Math.random() * 2) + 4,
      comment: reviewComments[i % reviewComments.length],
      buyerId, sellerId: product.sellerId, productId: product.id, orderId: order.id,
    }).onConflictDoNothing();

    await db.insert(walletTransactionsTable).values({
      sellerId: product.sellerId, type: "earning", amount: product.price * 0.9,
      description: `Sipariş #${order.id}`, orderId: order.id,
    });
  }
  console.log("✅ Orders and reviews seeded");
  console.log("🎉 Seed complete!");
  console.log("Demo accounts: buyer@demo.com / demo123, ayse@demo.com / demo123");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
