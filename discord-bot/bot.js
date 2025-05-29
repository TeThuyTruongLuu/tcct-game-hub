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

const serviceAccount = require('./serviceAccount.json');
console.log('Loaded serviceAccount keys:', Object.keys(serviceAccount));

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  process.exit(1);
}

const db = admin.firestore();

client.once('ready', () => {
  console.log(`Bot đã sẵn sàng! Đăng nhập với tên: ${client.user.tag}`);
});

const channelId = '1236906035932041286';

client.on('messageCreate', async (message) => {
  if (message.channelId !== channelId || !message.author.bot) return;

  try {
    await message.react('✅');
    await message.react('❌');
    console.log(`Đã thêm reactions vào tin nhắn ${message.id}`);
  } catch (error) {
    console.error('Lỗi khi thêm reactions:', error);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  console.log(`Reaction received: ${reaction.emoji.name} by ${user.tag} in channel ${reaction.message.channelId}`); // Debug

  if (user.bot) return;

  const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

  if (message.channelId !== channelId) {
    console.log(`Wrong channel: ${message.channelId} (expected: ${channelId})`); // Debug
    return;
  }

  const emoji = reaction.emoji.name;
  if (emoji !== '✅' && emoji !== '❌') {
    console.log(`Invalid emoji: ${emoji}`); // Debug
    return;
  }

  let member;
  try {
    member = await message.guild.members.fetch(user.id);
  } catch (error) {
    console.error(`Lỗi khi fetch member ${user.tag}:`, error);
    return;
  }

  const isAdmin = member.roles.cache.some(role => role.name.toLowerCase() === 'admin') || member.permissions.has('Administrator');
  if (!isAdmin) {
    console.log(`User ${user.tag} is not admin`); // Debug
    await message.channel.send({ content: `${user.tag}, bạn cần quyền Admin để duyệt/từ chối Nonogram.`, ephemeral: true });
    return;
  }

  const puzzleId = message.embeds[0]?.fields.find(field => field.name === 'ID')?.value;
  if (!puzzleId) {
    console.log('No puzzleId found in embed:', JSON.stringify(message.embeds, null, 2)); // Debug
    await message.channel.send({ content: 'Không tìm thấy ID Nonogram trong tin nhắn.', ephemeral: true });
    return;
  }

  try {
    const pendingRef = db.collection('pendingNonograms').doc(puzzleId);
    const pendingDoc = await pendingRef.get();

    if (!pendingDoc.exists) {
      console.log(`No pending Nonogram for puzzleId: ${puzzleId}`); // Debug
      await message.channel.send({ content: 'Không tìm thấy Nonogram để duyệt.', ephemeral: true });
      return;
    }

    const puzzleData = pendingDoc.data();
    if (puzzleData.status !== 'pending') {
      console.log(`Nonogram already processed: ${puzzleData.status}`); // Debug
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
      console.log(`Approved Nonogram: ${puzzleId}`); // Debug

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
      console.log(`Rejected Nonogram: ${puzzleId}`); // Debug

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

    await message.reactions.removeAll();
    console.log(`Cleared reactions for message ${message.id}`);
  } catch (error) {
    console.error(`Lỗi khi xử lý Nonogram ${puzzleId}:`, error);
    await message.channel.send({ content: 'Đã xảy ra lỗi khi xử lý Nonogram.', ephemeral: true });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
  console.error('Lỗi đăng nhập bot:', error);
  process.exit(1);
});