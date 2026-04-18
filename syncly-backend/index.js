import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const corsOptions = {
    origin: "*",
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Syncly Backend is running");
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
