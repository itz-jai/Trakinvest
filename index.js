const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Files = require('./dbModel');
const bodyParser = require('body-parser');
dotenv.config();

const PORT = process.env.PORT || 5000;

var app = express();
const server = http.createServer(app);

const connect = mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

connect.then((db) => {
    console.log("Connected to Database!");
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


const amqp = require('amqplib/callback_api');
const CONN_URL = process.env.CONN_URL;
let ch = null;
amqp.connect(CONN_URL, function (err, conn) {
   conn.createChannel(function (err, channel) {
      ch = channel;
   });
});
const publishToQueue = async (queueName, data) => {
   ch.sendToQueue(queueName, new Buffer.alloc(data), {}, function(err, ok) {
    if (err !== null) console.warn(err);
    else console.log('Message working');
  });
}
process.on('exit', (code) => {
   ch.close();
   console.log(`Closing rabbitmq channel`);
});

app.post('/setRecord',  async (req, res, next) => {
    const { name, email} = req.body;
    const file = new Files({name, email});
    try {
        const newFile = await file.save();
        console.log(newFile);
        res.status(200).json({ newFile });
        await publishToQueue("user-messages", newFile._id);
      } catch (err) {
        console.log({ message: err.message });
      }
});

app.get('/getRecord', (req, res, next) => {
    const { id } = req.body;
    Files.findOne({_id: id}).then((file) => {
        console.log(file);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json({file});
    })
})



server.listen(PORT, () => {
    console.log(`Server is running at port: ${PORT}`);
});
