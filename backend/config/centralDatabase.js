// Load environment variables from the .env file.
import "dotenv/config";

// PrismaClient is used to communicate with our PostgreSQL database using Prisma ORM.
import { PrismaClient } from "@prisma/client";

// Prisma 7 uses the PostgreSQL adapter to connect Prisma with the PostgreSQL database.
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
    connectionString: process.env.CENTRAL_DATABASE_URL
});

// Create a Prisma client using the PostgreSQL adapter. We use this client to execute queries on the central database.
const prisma = new PrismaClient({
    adapter
});

// Export the Prisma client so that it can be reused
// in controllers, services, and middleware without
// creating a new database connection every time.
export default prisma;