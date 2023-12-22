const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const connectDB = require("./db/connectDB");
const User = require("./models/User");
const Task = require("./models/Task");
const port = process.env.PORT || 3000;

// middlewares
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(cookieParser());

// my middlewares
const verifyId = async (req, res, next) => {
  const id = req.params.id;
  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  if (!isValidObjectId) {
    return res.status(404).send({ error: "invalid id" });
  }
  next();
};

// auth middlewares
const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

app.get("/", (req, res) => {
  res.send("Task Manager Server Running");
});

async function run() {
  // Send a ping to confirm a successful connection
  try {
    // Get the database and collection on which to run the operation

    await connectDB();

    // auth related api
    app.post("/jwt", async (req, res) => {
      try {
        const user = req.body;
        const token = jwt.sign(
          {
            email: user.email,
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "10h" }
        );
        res
          .cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production" ? true : false,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
      } catch (error) {
        console.log(error);
      }
    });
    app.post("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production" ? true : false,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
      } catch (error) {
        console.log(error);
      }
    });

    // users related apis
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        const query = { email: user.email };
        const existingUser = await User.findOne(query);
        if (existingUser) {
          return res.send({ message: "user already exists", insertedId: null });
        }
        const result = await User.create(user);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    // tasks related apis
    app.post("/tasks", async (req, res) => {
      try {
        const task = req.body;
        const result = await Task.create(task);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.get("/tasks", async (req, res) => {
      try {
        const email = req.query.email;
        const result = await Task.find({ email });
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
    // console.log("db not connecting");
  }
}
run().catch(console.dir);
app.listen(port, (req, res) => {
  console.log(`Listening at port ${port}`);
});
