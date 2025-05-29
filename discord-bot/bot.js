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

// Load service account from file to avoid JSON parse issues
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

client.once('ready', () => {
  console.log(`Bot đã sẵn sàng! Đăng nhập với tên: ${client.user.tag}`);
});

// Lắng nghe tin nhắn mới để thêm reactions
client.on('messageCreate', async (message) => {
  const CHANNEL_ID = '1236906035932041286';
  if (message.channelId !== CHANNEL_ID || message.author.bot === false) return;

  if (message.content.includes('**Nonogram mới cần duyệt**')) {
    try {
      await message.react('✅');
      await message.react('❌');
      console.log(`Đã thêm reactions vào tin nhắn ${message.id}`);
    } catch (error) {
      console.error('Lỗi khi thêm reactions:', error);
    }
  }
});

// Xử lý khi admin react
client.on('messageReactionAdd', async (reaction, user) => {
  // Bỏ qua reactions từ bot
  if (user.bot) return;

  // Lấy message đầy đủ
  const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

  // Kiểm tra kênh và nội dung tin nhắn
  const CHANNEL_ID = '1236906035932041286';
  if (message.channelId !== CHANNEL_ID || !message.content.includes('**Nonogram mới cần duyệt**')) return;

  // Kiểm tra emoji
  const emoji = reaction.emoji.name;
  if (emoji !== '✅' && emoji !== '❌') return;

  // Kiểm tra quyền admin
  const member = await message.guild.members.fetch(user.id);
  const isAdmin = member.roles.cache.some(role => role.name.toLowerCase() === 'admin');
  if (!isAdmin) {
    await message.channel.send({ content: `${user.tag}, bạn cần quyền Admin để duyệt/từ chối Nonogram.`, ephemeral: true });
    return;
  }

  // Lấy puzzleId từ embed
  const puzzleId = message.embeds[0]?.fields.find(field => field.name === 'ID')?.value;
  if (!puzzleId) {
    await message.channel.send({ content: 'Không tìm thấy ID Nonogram trong tin nhắn.', ephemeral: true });
    return;
  }

  try {
    const pendingRef = db.collection('pendingNonograms').doc(puzzleId);
    const pendingDoc = await pendingRef.get();

    if (!pendingDoc.exists) {
      await message.channel.send({ content: 'Không tìm thấy Nonogram để duyệt.', ephemeral: true });
      return;
    }

    const puzzleData = pendingDoc.data();
    if (puzzleData.status !== 'pending') {
      await message.channel.send({ content: 'Nonogram này đã được xử lý trước đó.', ephemeral: true });
      return;
    }

    if (emoji === '✅') {
      await pendingRef.update({ status: 'approved' });

      await db.collection('approvedNonograms').doc(puzzleId).set({
        ...puzzleData,
        imageUrl: puzzleData.imageUrl || '',
        coverUrl: puzzleData.coverUrl || '',
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await message.channel.send({ content: `Nonogram "${puzzleData.title}" đã được duyệt bởi ${user.tag}!` });

      const notificationWebhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
      if (notificationWebhookUrl) {
        await fetch(notificationWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `Nonogram "${puzzleData.title}" của bạn đã được duyệt bởi ${user.tag}!`
          })
        });
      }
    } else if (emoji === '❌') {
      await pendingRef.update({ status: 'rejected' });

      await message.channel.send({ content: `Nonogram "${puzzleData.title}" đã bị từ chối bởi ${user.tag}.` });

      const notificationWebhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
      if (notificationWebhookUrl) {
        await fetch(notificationWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `Nonogram "${puzzleData.title}" của bạn đã bị từ chối bởi ${user.tag}.`
          })
        });
      }
    }

    // Xóa reactions để tránh xử lý lại
    await message.reactions.removeAll();
  } catch (error) {
    console.error('Lỗi khi xử lý Nonogram:', error);
    await message.channel.send({ content: 'Đã xảy ra lỗi khi xử lý Nonogram.', ephemeral: true });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
  console.error('Lỗi đăng nhập bot:', error);
});