import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import MenuItem from '../models/MenuItem.js';
import Table from '../models/Table.js';
import { generateTableQrDataUrl } from '../utils/qrGenerator.js';

const users = [
  { name: 'Admin', email: 'admin@dhaba.com', phone: '9999999999', password: 'Admin@12345', role: 'ADMIN' },
  { name: 'Staff', email: 'staff@dhaba.com', phone: '8888888888', password: 'Staff@12345', role: 'STAFF' },
  { name: 'Kitchen', email: 'kitchen@dhaba.com', phone: '7777777777', password: 'Kitchen@12345', role: 'KITCHEN' }
];

const menuItems = [
  ['Tawa Roti', 'Roti', 10, 5],
  ['Butter Roti', 'Roti', 15, 5],
  ['Dal Fry', 'Dal', 120, 15],
  ['Dal Tadka', 'Dal', 140, 15],
  ['Paneer Butter Masala', 'Paneer', 220, 20],
  ['Aloo Jeera', 'Sabzi', 130, 15],
  ['Veg Biryani', 'Rice', 180, 20],
  ['Rice Plate', 'Rice', 110, 12],
  ['Lassi', 'Drinks', 60, 3],
  ['Tea', 'Drinks', 20, 3],
  ['Water Bottle', 'Drinks', 20, 1],
  ['Thali', 'Meals', 180, 18]
];

const seed = async () => {
  await connectDB();

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await User.findOneAndUpdate(
      { email: user.email },
      { name: user.name, email: user.email, phone: user.phone, passwordHash, role: user.role, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  await Settings.findOneAndUpdate(
    {},
    {
      dhabaName: 'My Dhaba',
      phone: '9999999999',
      address: 'Main Road Dhaba',
      upiId: '6394746719@kotak',
      deliveryEnabled: true,
      minDeliveryOrderAmount: 200,
      acceptanceWindowMinutes: 10,
      orderPrefix: 'ORD-',
      kotPrefix: 'KOT-',
      billPrefix: 'BILL-',
      deliveryCharges: {
        within5km: 50,
        between5to10km: 100
      },
      soundEnabled: true
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  for (const [name, category, price, prepTimeMinutes] of menuItems) {
    await MenuItem.findOneAndUpdate(
      { name, category },
      {
        name,
        category,
        price,
        prepTimeMinutes,
        description: `${name} from the dhaba kitchen`,
        isAvailable: true,
        stockStatus: 'IN_STOCK'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  for (let tableNumber = 1; tableNumber <= 10; tableNumber += 1) {
    let table = await Table.findOne({ tableNumber });
    if (!table) {
      table = new Table({
        tableNumber,
        capacity: 4,
        token: crypto.randomBytes(24).toString('hex'),
        isActive: true
      });
    }
    table.qrCodeUrl = await generateTableQrDataUrl(table);
    await table.save();
  }

  console.log('Seed complete');
  await disconnectDB();
};

seed().catch(async (error) => {
  console.error(error);
  await disconnectDB();
  process.exit(1);
});
