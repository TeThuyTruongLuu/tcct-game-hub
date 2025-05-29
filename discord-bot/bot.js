require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');
const admin = require('firebase-admin');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions
  ]
});

// Load service account from environment variable
const serviceAccount = JSON.parse(process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

client.once('ready', () => {
  console.log(`Bot đã sẵn sàng! Đăng nhập với tên: ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // Kiểm tra quyền admin
  const isAdmin = interaction.member.roles.cache.some(role => role.name === 'Admin'); // Thay 'Admin' bằng tên vai trò thực tế
  if (!isAdmin) {
    await interaction.reply({ content: 'Bạn cần quyền Admin để thực hiện hành động này.', ephemeral: true });
    return;
  }

  const puzzleId = interaction.customId.split('_')[1];

  try {
    const pendingRef = db.collection('pendingNonograms').doc(puzzleId);
    const pendingDoc = await pendingRef.get();

    if (!pendingDoc.exists) {
      await interaction.reply({ content: 'Không tìm thấy Nonogram để duyệt.', ephemeral: true });
      return;
    }

    const puzzleData = pendingDoc.data();
    if (puzzleData.status !== 'pending') {
      await interaction.reply({ content: 'Nonogram này đã được xử lý trước đó.', ephemeral: true });
      return;
    }

    if (interaction.customId.startsWith('approve_')) {
      await pendingRef.update({ status: 'approved' });

      await db.collection('approvedNonograms').doc(puzzleId).set({
        ...puzzleData,
        imageUrl: puzzleData.imageUrl || '', // Đảm bảo trường tồn tại
        coverUrl: puzzleData.coverUrl || '', // Đảm bảo trường tồn tại
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await interaction.reply({ content: `Nonogram "${puzzleData.title}" đã được duyệt và thêm vào Album!`, ephemeral: true });

      // Gửi thông báo cho người tạo (nếu có kênh hoặc webhook)
      const notificationWebhookUrl = process.env.NOTIFICATION_WEBHOOK_URL; // Thêm vào .env nếu cần
      if (notificationWebhookUrl) {
        await fetch(notificationWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `Nonogram "${puzzleData.title}" của bạn đã được duyệt bởi ${interaction.user.tag}!`
          })
        });
      }
    } else if (interaction.customId.startsWith('reject_')) {
      await pendingRef.update({ status: 'rejected' });

      await interaction.reply({ content: `Nonogram "${puzzleData.title}" đã bị từ chối.`, ephemeral: true });

      // Gửi thông báo cho người tạo (nếu có kênh hoặc webhook)
      const notificationWebhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
      if (notificationWebhookUrl) {
        await fetch(notificationWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `Nonogram "${puzzleData.title}" của bạn đã bị từ chối bởi ${interaction.user.tag}.`
          })
        });
      }
    }
  } catch (error) {
    console.error('Lỗi khi xử lý Nonogram:', error);
    await interaction.reply({ content: 'Đã xảy ra lỗi khi xử lý Nonogram.', ephemeral: true });
  }
});

// Load Discord bot token from environment variable
client.login(process.env.DISCORD_BOT_TOKEN);

