
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
(async () => {
  await mongoose.connect('mongodb://localhost:27017/newshop20123');
  const db = mongoose.connection.db;
  const newPasswordHash = await bcrypt.hash('admin123', 12);
  const result = await db.collection('users').updateOne(
      { email: 'ujwal009@gmail.com' },
      { $set: { password: newPasswordHash } }
  );
  console.log('Update result:', result);
  process.exit();
})();
