// Run: node set-admin.js <email>
require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first');
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const User     = require('./models/User');

const email = process.argv[2];
if (!email) { console.error('Usage: node set-admin.js <email>'); process.exit(1); }

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { role: 'admin' },
    { new: true }
  );
  if (!user) { console.error(`❌ No user found with email: ${email}`); }
  else { console.log(`✅ ${user.name} (${user.email}) is now ADMIN`); }
  mongoose.disconnect();
}).catch((err) => { console.error('DB error:', err.message); process.exit(1); });
