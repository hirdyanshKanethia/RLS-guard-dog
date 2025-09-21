import { MongoClient } from "mongodb";
import { NextResponse } from "next/server";

// This is a cached client instance to improve performance.
let client;
let clientPromise;

// Set up MongoDB connection options
const uri = process.env.MONGO_URI;
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

if (!process.env.MONGO_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

// Function to connect to MongoDB
if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// The main API handler function
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGO_DB_NAME);

    const averages = await db.collection("class_averages").find({}).toArray();

    return NextResponse.json(averages);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch class averages." },
      { status: 500 }
    );
  }
}
