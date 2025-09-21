// Import necessary libraries from Deno's ecosystem
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { MongoClient } from "npm:mongodb@6.1.0";
// import { MongoClient } from "https://deno.land/x/mongo@v0.31.1/mod.ts";

console.log("Function starting up...");

// Define a type for our progress records for better type safety.
interface ProgressRecord {
  classroom_id: string;
  score: number;
}

// This is the main function that handles incoming requests
serve(async (_req) => {
  let mongoClient: MongoClient | null = null;
  
  try {
    // --- 1. DIAGNOSTIC LOGGING ---
    // Check both possible environment variable names
    const mongoUri = Deno.env.get("MONGO_URI") || Deno.env.get("MONGODB_URI");
    const dbName = Deno.env.get("MONGO_DB_NAME") || Deno.env.get("MONGODB_DB_NAME");
    
    // Mask the sensitive part of the URI for security
    const maskedUri = mongoUri ? `${mongoUri.substring(0, 25)}...${mongoUri.substring(mongoUri.length - 10)}` : "Not Set";

    console.log(`--- DIAGNOSTICS ---`);
    console.log(`Mongo DB Name: ${dbName}`);
    console.log(`Mongo URI (masked): ${maskedUri}`);
    console.log(`Available env vars: ${Object.keys(Deno.env.toObject()).filter(key => key.includes('MONGO')).join(', ')}`);
    console.log(`-------------------`);

    if (!mongoUri || !dbName) {
        throw new Error(`Missing environment variables. MONGO_URI: ${!!mongoUri}, MONGO_DB_NAME: ${!!dbName}`);
    }
    
    // --- 2. SET UP CLIENTS ---
    const supabaseAdmin = createClient(
      Deno.env.get("PROJECT_SUPABASE_URL")!,
      Deno.env.get("PROJECT_SERVICE_KEY")!
    );

    // FIXED: Correct way to connect with Deno MongoDB client
    const mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    const db = mongoClient.db(dbName);
    const averagesCollection = db.collection("class_averages");
    
    console.log("MongoDB connected successfully.");

    // --- 3. FETCH ALL PROGRESS DATA from Supabase ---
    const { data: progressRecords, error: progressError } = await supabaseAdmin
      .from("progress")
      .select("classroom_id, score")
      .returns<ProgressRecord[]>();

    if (progressError) throw progressError;

    if (!progressRecords || progressRecords.length === 0) {
        console.log("No progress records found.");
        return new Response(
          JSON.stringify({ message: "No progress records found to process." }),
          { headers: { "Content-Type": "application/json" }, status: 200 }
        );
    }

    console.log(`Fetched ${progressRecords.length} progress records.`);

    // --- 4. CALCULATE AVERAGES ---
    const classroomData = new Map<string, { totalScore: number; count: number }>();
    for (const record of progressRecords) {
      if (!classroomData.has(record.classroom_id)) {
        classroomData.set(record.classroom_id, { totalScore: 0, count: 0 });
      }
      const data = classroomData.get(record.classroom_id)!;
      data.totalScore += record.score;
      data.count++;
    }

    // --- 5. SAVE TO MONGODB ---
    const operations = [];
    for (const [classroomId, data] of classroomData.entries()) {
      const average = data.totalScore / data.count;
      
      operations.push({
        filter: { classroom_id: classroomId },
        update: { 
          $set: {
            average_score: parseFloat(average.toFixed(2)),
            last_calculated: new Date()
          }
        },
        upsert: true
      });
    }
    
    if (operations.length > 0) {
      // Use insertMany or updateMany instead of bulkWrite for Deno mongo client
      for (const op of operations) {
        await averagesCollection.updateOne(
          op.filter,
          op.update,
          { upsert: op.upsert }
        );
      }
      console.log(`Saved averages for ${operations.length} classrooms to MongoDB.`);
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully calculated and saved averages for ${operations.length} classrooms.`,
        processed_records: progressRecords.length
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("Full error details:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  } finally {
    // Always close the MongoDB connection
    if (mongoClient) {
      try {
        mongoClient.close();
        console.log("MongoDB connection closed.");
      } catch (closeError) {
        console.error("Error closing MongoDB connection:", closeError);
      }
    }
  }
});