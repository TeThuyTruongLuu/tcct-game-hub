require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');
const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

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

const channelId = process.env.TARGET_CHANNEL_ID || '1236906035932041286';

client.on('messageCreate', async (message) => {
  if (
    message.channelId !== channelId ||
    (!message.author.bot && !message.webhookId)
  ) return;

  let foundId = false;

  for (const embed of message.embeds) {
    if (embed.fields?.some(f => f.name.toLowerCase() === 'id')) {
      foundId = true;
      break;
    }
    if (embed.description && /ID[:：]?\s*(puzzle_\d+)/i.test(embed.description)) {
      foundId = true;
      break;
    }
  }

  if (!foundId && !/ID[:：]?\s*(puzzle_\d+)/i.test(message.content)) {
    console.log('Bỏ qua message không chứa ID:', message.id);
    return;
  }

  try {
    await message.react('✅');
    await message.react('❌');
    console.log(`Đã thêm reactions vào tin nhắn ${message.id}`);
  } catch (error) {
    console.error('Lỗi khi thêm reactions:', error);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  console.log(`Reaction received: ${reaction.emoji.name} by ${user.tag} in channel ${reaction.message.channelId}`);

  if (user.bot || user.id === client.user.id) return;

  const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

  if (message.channelId !== channelId) {
    console.log(`Wrong channel: ${message.channelId} (expected: ${channelId})`);
    return;
  }

  const emoji = reaction.emoji.name;
  if (emoji !== '✅' && emoji !== '❌') {
    console.log(`Invalid emoji: ${emoji}`);
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
    console.log(`User ${user.tag} is not admin`);
    await message.channel.send({ content: `${user.tag}, bạn cần quyền Admin để duyệt/từ chối Nonogram.` });
    return;
  }

  let puzzleId = null;
  for (const embed of message.embeds) {
    const field = embed.fields?.find(f => f.name.toLowerCase() === 'id');
    if (field) {
      puzzleId = field.value;
      break;
    }
    const match = embed.description?.match(/ID[:：]?\s*(puzzle_\d+)/i);
    if (match) {
      puzzleId = match[1];
      break;
    }
  }

  if (!puzzleId) {
    const match = message.content?.match(/\*{0,2}ID[:：]?\*{0,2}\s*(puzzle_\d+)/i);
    if (match) {
      puzzleId = match[1];
    }
  }

  if (!puzzleId) {
    console.log('Không tìm thấy puzzleId trong embed hoặc content.');
    console.log('Embeds:', JSON.stringify(message.embeds, null, 2));
    console.log('Full message content:', message.content);
    await message.channel.send({ content: 'Không tìm thấy ID Nonogram trong tin nhắn.' });
    return;
  }

  try {
    const pendingRef = db.collection('pendingNonograms').doc(puzzleId);
    const pendingDoc = await pendingRef.get();

    if (!pendingDoc.exists) {
      console.log(`No pending Nonogram for puzzleId: ${puzzleId}`);
      await message.channel.send({ content: 'Không tìm thấy Nonogram để duyệt.' });
      return;
    }

    const puzzleData = pendingDoc.data();
    if (puzzleData.status !== 'pending') {
      console.log(`Nonogram already processed: ${puzzleData.status}`);
      await message.channel.send({ content: 'Nonogram này đã được xử lý trước đó.' });
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
      console.log(`Approved Nonogram: ${puzzleId}`);

    } else if (emoji === '❌') {
      await pendingRef.update({ status: 'rejected' });

      await message.channel.send({ content: `Nonogram "${puzzleData.title}" đã bị từ chối bởi ${user.tag}.` });
      console.log(`Rejected Nonogram: ${puzzleId}`);
    }

    await message.reactions.removeAll();
    console.log(`Cleared reactions for message ${message.id}`);
  } catch (error) {
    console.error(`Lỗi khi xử lý Nonogram ${puzzleId}:`, error);
    await message.channel.send({ content: 'Đã xảy ra lỗi khi xử lý Nonogram.' });
  }
});

// 🚀 Thêm API Express cho client gọi
const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.BOT_API_PORT || 3001;

const multer = require('multer');
const upload = multer();

app.post('/send-message', upload.single('file'), async (req, res) => {
  try {
    const payload_json = req.body.payload_json;
    console.log('Nhận payload_json:', payload_json);

    if (!payload_json) {
      return res.status(400).send('Thiếu payload_json');
    }

    const payload = JSON.parse(payload_json);
    const { content, embeds } = payload;

    console.log('Gửi message với content:', content);
    console.log('Gửi message với embeds:', JSON.stringify(embeds, null, 2));

    const channel = await client.channels.fetch(process.env.TARGET_CHANNEL_ID || '1236906035932041286');
    if (!channel) {
      return res.status(404).send('Không tìm thấy channel');
    }

    const messagePayload = {
      content: content || '',
      embeds: embeds || []
    };

	await channel.send({
	  content,
	  embeds,
	  files: req.file ? [{
		attachment: req.file.buffer,
		name: req.file.originalname
	  }] : []
	});


    res.status(200).send('Đã gửi message qua bot');
  } catch (err) {
    console.error('Lỗi khi bot gửi message:', err);
    res.status(500).send('Lỗi server bot khi gửi message');
  }
});


app.listen(PORT, () => {
  console.log(`Bot API server đang lắng nghe tại port ${PORT}`);
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
  console.error('Lỗi đăng nhập bot:', error);
  process.exit(1);
});
