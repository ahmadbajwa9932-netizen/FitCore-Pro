require("dotenv").config();
const app = require("./src/app");

const start = async () => {
  try {
    await app.listen({ port: process.env.PORT || 4000 });
    console.log(`Server running on port ${process.env.PORT || 4000}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();