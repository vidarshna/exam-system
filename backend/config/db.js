import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const dbPath = path.resolve('database/local_db.json');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initial data structure
let data = {
  students: [],
  questions: [],
  exams: [],
  results: [],
  notifications: []
};

// Load data if file exists
if (fs.existsSync(dbPath)) {
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    if (raw.trim()) {
      data = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading local JSON database, starting clean:', e);
  }
}

const save = async () => {
  try {
    await fs.promises.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving local JSON database:', e);
  }
};

// Generate MongoDB-like 24-character hexadecimal ObjectId
const generateId = () => {
  return crypto.randomBytes(12).toString('hex');
};

const matchQuery = (doc, query) => {
  for (const key in query) {
    if (query[key] && typeof query[key] === 'object' && !Array.isArray(query[key])) {
      // Handle operators like $in
      if ('$in' in query[key]) {
        const val = doc[key];
        const searchList = query[key]['$in'];
        if (Array.isArray(val)) {
          if (!val.some(v => searchList.includes(v))) return false;
        } else {
          if (!searchList.includes(val)) return false;
        }
      }
    } else {
      if (doc[key] !== query[key]) return false;
    }
  }
  return true;
};

class Collection {
  constructor(name) {
    this.name = name;
  }

  async find(query = {}) {
    return (data[this.name] || [])
      .filter(doc => matchQuery(doc, query))
      .map(doc => ({ ...doc }));
  }

  async findOne(query = {}) {
    const found = (data[this.name] || []).find(doc => matchQuery(doc, query));
    return found ? { ...found } : null;
  }

  async insertOne(doc) {
    if (!data[this.name]) {
      data[this.name] = [];
    }
    const newDoc = {
      _id: doc._id || generateId(),
      ...doc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data[this.name].push(newDoc);
    await save();
    return { ...newDoc };
  }

  async insertMany(docs) {
    if (!data[this.name]) {
      data[this.name] = [];
    }
    const created = docs.map(doc => ({
      _id: doc._id || generateId(),
      ...doc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    data[this.name].push(...created);
    await save();
    return created.map(doc => ({ ...doc }));
  }

  async updateOne(query, update) {
    const idx = (data[this.name] || []).findIndex(doc => matchQuery(doc, query));
    if (idx === -1) return { matchedCount: 0, modifiedCount: 0 };

    const doc = data[this.name][idx];
    const updated = {
      ...doc,
      ...(update.$set || update),
      updatedAt: new Date().toISOString()
    };
    
    // Ensure we don't overwrite _id
    updated._id = doc._id;

    data[this.name][idx] = updated;
    await save();
    return { matchedCount: 1, modifiedCount: 1, doc: { ...updated } };
  }

  async deleteOne(query) {
    const idx = (data[this.name] || []).findIndex(doc => matchQuery(doc, query));
    if (idx === -1) return { deletedCount: 0 };

    data[this.name].splice(idx, 1);
    await save();
    return { deletedCount: 1 };
  }

  async updateMany(query, update) {
    let modifiedCount = 0;
    const list = data[this.name] || [];
    for (let i = 0; i < list.length; i++) {
      if (matchQuery(list[i], query)) {
        list[i] = {
          ...list[i],
          ...(update.$set || update),
          updatedAt: new Date().toISOString()
        };
        modifiedCount++;
      }
    }
    if (modifiedCount > 0) {
      await save();
    }
    return { matchedCount: modifiedCount, modifiedCount };
  }

  async deleteMany(query = {}) {
    if (!data[this.name]) return { deletedCount: 0 };
    const initialLength = data[this.name].length;
    data[this.name] = data[this.name].filter(doc => !matchQuery(doc, query));
    const deletedCount = initialLength - data[this.name].length;
    if (deletedCount > 0) {
      await save();
    }
    return { deletedCount };
  }

  async countDocuments(query = {}) {
    return (data[this.name] || []).filter(doc => matchQuery(doc, query)).length;
  }
}

export const db = {
  students: new Collection('students'),
  questions: new Collection('questions'),
  exams: new Collection('exams'),
  results: new Collection('results'),
  notifications: new Collection('notifications')
};
