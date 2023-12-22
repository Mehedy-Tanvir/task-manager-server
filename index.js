const express = require("express");
const app = express();
const mongoose = require("mongoose");
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
    origin: [
      "https://tasky-task-manager-c6b10.web.app",
      "https://tasky-task-manager-c6b10.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(cookieParser());

// // my middlewares
// const verifyId = async (req, res, next) => {
//   const id = req.params.id;
//   const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
//   if (!isValidObjectId) {
//     return res.status(404).send({ error: "invalid id" });
//   }
//   next();
// };

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
    app.post("/tasks", verifyToken, async (req, res) => {
      try {
        const task = req.body;
        const result = await Task.create(task);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.get("/tasks/:id", verifyToken, async (req, res) => {
      try {
        const taskId = req.params.id;

        // Check if the provided taskId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
          return res.status(400).json({ message: "Invalid taskId format" });
        }

        // Check if the task exists
        const existingTask = await Task.findById(taskId);
        if (!existingTask) {
          return res.status(404).json({ message: "Task not found" });
        }
        res.json(existingTask);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ message: "Internal Server Error", error: error.message });
      }
    });
    // app.put("/tasks/:id", async (req, res) => {
    //   try {
    //     const taskId = req.params.id;
    //     const updatedTask = req.body;

    //     // Check if the provided taskId is a valid Object
    //     if (!mongoose.Types.ObjectId.isValid(taskId)) {
    //       return res.status(400).json({ message: "Invalid taskId format" });
    //     }

    //     const result = await Task.findByIdAndUpdate(taskId, updatedTask, {
    //       new: true,
    //     });
    //     res.send(result);
    //   } catch (error) {
    //     console.log(error);
    //   }
    // });
    app.delete("/tasks/:taskId", verifyToken, async (req, res) => {
      try {
        const taskId = req.params.taskId;

        // Check if the provided taskId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
          return res.status(400).json({ message: "Invalid taskId format" });
        }

        // Check if the task exists
        const existingTask = await Task.findById(taskId);
        if (!existingTask) {
          return res.status(404).json({ message: "Task not found" });
        }

        const result = await Task.findByIdAndDelete(taskId);

        if (!result) {
          return res.status(404).json({ message: "Task not found" });
        }
        res.json(result);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ message: "Internal Server Error", error: error.message });
      }
    });

    app.patch("/tasks/:taskId", verifyToken, async (req, res) => {
      try {
        const taskId = req.params.taskId;
        const updatedFields = req.body;

        const result = await Task.findByIdAndUpdate(taskId, updatedFields, {
          new: true,
        });

        if (!result) {
          return res.status(404).json({ message: "Task not found" });
        }

        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
    app.get("/tasks", verifyToken, async (req, res) => {
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
