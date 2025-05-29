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

  if (interaction.customId.startsWith('approve_')) {
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

      await pendingRef.update({ status: 'approved' });

      await db.collection('approvedNonograms').doc(puzzleId).set({
        ...puzzleData,
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await interaction.reply({ content: 'Nonogram đã được duyệt và thêm vào Album!', ephemeral: true });
    } catch (error) {
      console.error('Lỗi khi duyệt Nonogram:', error);
      await interaction.reply({ content: 'Đã xảy ra lỗi khi duyệt Nonogram.', ephemeral: true });
    }
  }
});

// Load Discord bot token from environment variable
client.login(process.env.DISCORD_BOT_TOKEN);