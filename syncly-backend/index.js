import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { sequelize, syncDatabase } from "./db/models.js";
import userRoutes from './routes/user-routes/user-routes.js';
import woocommerceRoutes from "./routes/connectors/woocommerce-routes.js";
import shopifyRoutes from "./routes/connectors/shopify-routes.js";
import synclyMerchantRouter from "./routes/syncly-merchant-router.js";
import mobileRouter from "./routes/mobile-router.js";
import billingRoutes from "./routes/billing-routes.js";
import stripeWebhookRouter from "./routes/stripe-webhook.js";
import { startSyncWorker } from "./services/sync/worker.js";
import { startEmailCampaignWorker } from "./services/email-campaign-worker.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(path.join(uploadsDir, "mobile"), { recursive: true });

const app = express();

const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: "3.0.3",
        info: {
            title: "Syncly API",
            version: "1.0.0",
            description: "HTTP API for Syncly (user management)",
        },
        servers: [{ url: `http://localhost:${process.env.PORT || 3000}` }],
    },
    apis: ["./routes/user-routes/user-routes.js"],
});

const corsOptions = {
    origin: "*",
    credentials: true,
};

app.use(cors(corsOptions));
app.use("/uploads", express.static(uploadsDir));
app.use("/api/webhooks/stripe", stripeWebhookRouter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("Syncly Backend is running");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/users', userRoutes);
app.use("/api/mobile", mobileRouter);
app.use("/api/syncly", synclyMerchantRouter);
app.use("/api/billing", billingRoutes);
app.use("/api/connectors/woocommerce", woocommerceRoutes);
app.use("/api/connectors/shopify", shopifyRoutes);

const PORT = Number(process.env.PORT || 3000);

sequelize
    .authenticate()
    .then(() => {
        console.log("MySQL connection OK (Sequelize)");
        return syncDatabase();
    })
    .then(() => {
        console.log("Database tables synced");
        startSyncWorker();
        startEmailCampaignWorker();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("Unable to connect or sync the database:", err.message);
        process.exit(1);
    });
