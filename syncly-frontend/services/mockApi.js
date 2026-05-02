function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginMock(email, password) {
  await delay(850);

  if (!String(email || '').trim() || !String(password || '').trim()) {
    throw new Error('Email and password are required.');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const displayName = normalizedEmail.split('@')[0] || 'Admin';

  return {
    user: {
      name: displayName
        .split(/[._-]/)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(' '),
      email: normalizedEmail,
      role: 'Central Admin',
    },
  };
}

export async function fetchMockProducts(products) {
  await delay(500);
  return Array.isArray(products) ? [...products] : [];
}

export async function fetchMockOrders(orders) {
  await delay(500);
  return Array.isArray(orders) ? [...orders] : [];
}