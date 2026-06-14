/**
 * MediQr Load Test User Seeder
 * --------------------------------
 * Creates N pre-verified patient users directly in MongoDB,
 * bypassing the OTP email verification flow.
 *
 * Usage:
 *   1. Edit the CONFIG section below to match your schema.
 *   2. Run: node seed-loadtest-users.js
 *   3. A users.csv file will be generated for JMeter's CSV Data Set Config.
 *
 * IMPORTANT: Run this ONLY against your local/test DB, never production.
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const fs = require('fs');

// ====================== CONFIG - EDIT THESE ======================
const MONGO_URI = 'mongodb://localhost:27017/mediqr'; // your connection string (include DB name here OR set DB_NAME below)
const DB_NAME = 'mediqr';                         // your database name
const COLLECTION_NAME = 'users';                  // mongoose model 'user' -> collection 'users'

const NUM_USERS = 20;                             // how many test users to create
const PASSWORD = '123456789';                     // plaintext password (same for all, for simplicity)
const BCRYPT_SALT_ROUNDS = 10;                    // CHECK your auth controller's bcrypt.hash(password, X) and match X here

const EMAIL_PREFIX = 'loadtest';
const EMAIL_DOMAIN = 'mediqr.com';                // e.g. loadtest1@mediqr.com (20 chars, > 13 char min)

// Generates a unique 12-digit aadhar number for each user
// Using a fixed prefix + index to guarantee uniqueness and exactly 12 digits
function generateAadhar(index) {
  return `9999999900${String(index).padStart(2, '0')}`; // e.g. 999999990001, 999999990002...
}

// Matches the MediQr user schema exactly
function buildUserDoc(index, hashedPassword) {
  return {
    username: `loadtestuser${index}`,             // min 3 chars - ok
    email: `${EMAIL_PREFIX}${index}@${EMAIL_DOMAIN}`,
    password: hashedPassword,
    adharnumber: generateAadhar(index),           // required, unique, exactly 12 digits
    isVerified: true,                             // bypass OTP verification
    address: 'Load Test Address, Mumbai, MH',     // required, min 5 chars
    bloodGroup: 'O+',
    medication: '',
    allergies: '',
    emergencyContacts: [],
    pastSurgeries: [],
  };
}
// ===================================================================

async function main() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);
    const usersCollection = db.collection(COLLECTION_NAME);

    const hashedPassword = await bcrypt.hash(PASSWORD, BCRYPT_SALT_ROUNDS);
    console.log(`Generated bcrypt hash (salt rounds=${BCRYPT_SALT_ROUNDS})`);

    const docs = [];
    const csvRows = ['email,password']; // header row for JMeter CSV Data Set Config

    for (let i = 1; i <= NUM_USERS; i++) {
      const doc = buildUserDoc(i, hashedPassword);
      docs.push(doc);
      csvRows.push(`${doc.email},${PASSWORD}`);
    }

    // Remove any pre-existing load test users with these emails first (idempotent re-runs)
    const emails = docs.map(d => d.email);
    const delResult = await usersCollection.deleteMany({ email: { $in: emails } });
    if (delResult.deletedCount > 0) {
      console.log(`Removed ${delResult.deletedCount} existing load test users (re-seeding)`);
    }

    const insertResult = await usersCollection.insertMany(docs);
    console.log(`Inserted ${insertResult.insertedCount} verified users`);

    fs.writeFileSync('users.csv', csvRows.join('\n'));
    console.log(`Wrote users.csv with ${NUM_USERS} user records (for JMeter CSV Data Set Config)`);

    console.log('\nSample login credentials:');
    console.log(`  email: ${docs[0].email}`);
    console.log(`  password: ${PASSWORD}`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

main();
