import { MongoClient } from 'mongodb';

let client;
let clientPromise;

export default async function getClientPromise() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, { maxPoolSize: 10 });
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, { maxPoolSize: 10 });
      clientPromise = client.connect();
    }
  }

  return clientPromise;
}