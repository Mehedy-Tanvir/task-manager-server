const mongoose = require("mongoose");
require("dotenv").config();

const getConnectionString = () => {
  const connectionUrl = process.env.DATABASE;
  return connectionUrl;
};

const connectDB = async () => {
  console.log("connecting to database");
  const mongoURI = getConnectionString();

  await mongoose.connect(mongoURI, { dbName: process.env.DB_NAME });
  console.log("connected to database");
};

module.exports = connectDB;
