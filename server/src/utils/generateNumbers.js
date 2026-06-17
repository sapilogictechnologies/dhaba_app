const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const generateUniqueNumber = async ({ model, field, prefix }) => {
  const matcher = new RegExp(`^${escapeRegex(prefix)}\\d+$`);
  const count = await model.countDocuments({ [field]: matcher });
  let next = count + 1;
  let value = `${prefix}${String(next).padStart(5, '0')}`;

  while (await model.exists({ [field]: value })) {
    next += 1;
    value = `${prefix}${String(next).padStart(5, '0')}`;
  }

  return value;
};

export const generateOrderAndKotNumbers = async (Order, settings) => ({
  orderNo: await generateUniqueNumber({ model: Order, field: 'orderNo', prefix: settings.orderPrefix }),
  kotNo: await generateUniqueNumber({ model: Order, field: 'kotNo', prefix: settings.kotPrefix })
});

export const generateBillNumber = async (Order, settings) =>
  generateUniqueNumber({ model: Order, field: 'billNo', prefix: settings.billPrefix });
