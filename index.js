const express = require("express");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./src/routes/auth.routes");
const complaintRoutes = require("./src/routes/complaint.routes");

const app = express();
const {requireAuth,requireRole} = require("./src/middlewares/auth.middleware");

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);

app.get(
  "/api/protected/student",
  requireAuth,
  requireRole("STUDENT"),
  (req, res) => {
    res.json({ message: "Welcome Student", user: req.user });
  },
);

app.get(
  "/api/protected/admin",
  requireAuth,
  requireRole("ADMIN"),
  (req, res) => {
    res.json({ message: "Welcome Admin", user: req.user });
  },
);



app.get("/", (req, res) => {
  res.send("Anti-Ragging Backend is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
 
});
