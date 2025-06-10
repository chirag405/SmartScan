/**
 * Script to apply database migrations
 */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase URL or key is missing in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  try {
    console.log("🔄 Applying database migrations...");

    // Get all migration files from the migrations directory
    const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort(); // Sort to ensure migrations are applied in order

    console.log(`📋 Found ${migrationFiles.length} migration files`);

    // Apply each migration file
    for (const file of migrationFiles) {
      console.log(`📝 Applying migration: ${file}`);

      // Read the SQL from the file
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

      // Execute the SQL
      const { error } = await supabase.rpc("exec_sql", { sql });

      if (error) {
        console.error(`❌ Error applying migration ${file}:`, error);
        // Continue with other migrations even if one fails
      } else {
        console.log(`✅ Migration ${file} applied successfully`);
      }
    }

    console.log("🎉 All migrations applied successfully");
  } catch (error) {
    console.error("❌ Error applying migrations:", error);
    process.exit(1);
  }
}

// Check if the exec_sql function exists, create if not
async function ensureExecSqlFunction() {
  try {
    console.log("🔍 Checking for exec_sql function...");

    // Define the SQL to create the exec_sql function if it doesn't exist
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
      
      -- Grant execute permission to the function
      GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;
      GRANT EXECUTE ON FUNCTION exec_sql TO service_role;
    `;

    // Create the function
    const { error } = await supabase
      .rpc("exec_sql", {
        sql: createFunctionSql,
      })
      .catch(() => {
        // If the function doesn't exist yet, we need to create it directly
        return supabase
          .from("_exec_sql")
          .rpc("exec", { sql: createFunctionSql });
      });

    if (error) {
      console.log("🔧 Creating exec_sql function...");

      // Try direct SQL execution
      const { error: directError } = await supabase
        .from("_direct_sql")
        .select(`*`)
        .eq("query", createFunctionSql);

      if (directError) {
        console.error("❌ Could not create exec_sql function:", directError);
        console.log(
          "⚠️ You may need to run the following SQL in the Supabase SQL editor:"
        );
        console.log(createFunctionSql);
        return false;
      }
    }

    console.log("✅ exec_sql function is ready");
    return true;
  } catch (error) {
    console.error("❌ Error checking/creating exec_sql function:", error);
    console.log(
      "⚠️ You may need to manually run migrations through the Supabase SQL editor"
    );
    return false;
  }
}

// Run the main function
async function main() {
  const functionReady = await ensureExecSqlFunction();
  if (functionReady) {
    await applyMigrations();
  }
}

main().catch(console.error);
