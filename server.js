const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
  console.log(`UNCAUGHT EXCEPTION: ${err.name} (${err.message})`);
  console.log('Shutting down..');

  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose.connect(DB, { useNewUrlParser: true, useUnifiedTopology: true }).then(con => {
  console.log(`Successfully connected to the DB ${con.connections[0].name} ..`);
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Application running on ${process.env.NODE_ENV} on port ${port}...`);
});

process.on('unhandledRejection', err => {
  console.log(`UNHANDLED REJECTION: ${err.name} (${err.message})`);
  console.log('Shutting down..');

  server.close(() => {
    process.exit(1);
  });
});
