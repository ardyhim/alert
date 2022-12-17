require('dotenv').config()
import express from "express";
import http from "http";
import cors from 'cors';
import bodyParser from "body-parser";
import { Server } from "socket.io";
import { MsEdgeTTS } from "msedge-tts";
import { AlertType, Prisma, PrismaClient } from '@prisma/client'
import { generateText } from './lib/index';
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});
const prisma = new PrismaClient();

app.use(cors());
app.use(bodyParser.json())
app.use("/files", express.static('file'))

const tts = new MsEdgeTTS();
tts.setMetadata("id-ID-ArdiNeural", MsEdgeTTS.OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);

app.use("*", (req, res, next) => {
  console.log(req.baseUrl); return next();
})

app.post("/test", async (req, res) => {
  try {
    console.log(req.body);

    const alerts = await prisma.alert.findFirst({
      where: { read: true },
      orderBy: { createdAt: "asc" },
    })

    const ttsName = `${Date.now()}-tts.webm`;
    let data: Prisma.AlertCreateInput = {
      type: AlertType.membership,
      name: req.body.name,
      message: req.body.message || "Apa kabar semuanya?",
      tts: ttsName,
      read: alerts != null ? false : true
    };
    if (req.body.type == "donation") {
      data.type = AlertType.donation;
      data.nominal = req.body.nominal;
      data.currency = req.body.currency;
    };
    if (req.body.type == "superChat") {
      data.type = AlertType.donation;
      data.nominal = req.body.nominal;
      data.currency = req.body.currency;
    };
    if (req.body.type == "membership") {
      data.type = AlertType.membership;
      data.month = req.body.month;
    }
    const alert = await prisma.alert.create({
      data
    });

    const setting = await prisma.setting.findFirst({
      where: { id: process.env.ID_SETTING }
    })
    res.json(setting);
  } catch (error) {
    console.error(error)
    res.json({ error })
  }
})

app.post('/tts', async (req, res) => {
  try {

    const alerts = await prisma.alert.findFirst({
      where: { read: true },
      orderBy: { createdAt: "asc" },
    })

    const ttsName = `${Date.now()}-tts.webm`;
    let data: Prisma.AlertCreateInput = {
      type: AlertType.membership,
      name: req.body.name,
      message: req.body.message || "Apa kabar semuanya?",
      tts: ttsName,
      read: alerts != null ? false : true
    };
    if (req.body.type == "donation") {
      data.type = AlertType.donation;
      data.nominal = req.body.nominal;
      data.currency = req.body.currency;
    };
    if (req.body.type == "superChat") {
      data.type = AlertType.donation;
      data.nominal = req.body.nominal;
      data.currency = req.body.currency;
    };
    if (req.body.type == "membership") {
      data.type = AlertType.membership;
      data.month = req.body.month;
    }
    const alert = await prisma.alert.create({
      data
    });

    const setting = await prisma.setting.findFirst({
      where: { name: process.env.ID_SETTING }
    })
    let message: string = "";
    if (req.body.type == "donation") message = setting!.donation;
    if (req.body.type == "superChat") message = setting!.superChat;
    if (req.body.type == "membership") message = setting!.membership;
    await tts.toFile("./file/" + ttsName, generateText(message, alert));
    if (alerts) {
      io.sockets.emit("alert_receive", alert);
    }
    return res.json({ message: "success" });
  } catch (error) {
    return res.json({ error: error }).status(400)
  }
})

// app.get("/hooks", (req, res) => {
//   io.emit("tts", { message: "Bagaimana cara untuk membuat sebuah program tentang pesan singkat" });
//   res.json({ status: 200 });
//   const readable = tts.toStream("Kak kaesang. Saya telat lulus 3 semester nie. Bukan gegara nikahan mas juga sih");
//   readable.on("data", (data) => {
//     console.log("DATA RECEIVED", data);
//     io.emit("tts", data);
//   });

//   readable.on("closed", () => {
//     console.log("STREAM CLOSED");
//   })
// });

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('alert_displayed', async (data) => {
    console.log('alert_displayed: ' + data);
    if (data && data.id != null) {
      await prisma.alert.update({
        where: { id: data.id },
        data: { read: true }
      });
      const alert = await prisma.alert.findFirst({
        where: { read: true },
        orderBy: { createdAt: "asc" },
      })
      if (alert) io.sockets.emit("alert_receive", alert);
    }
  });
});
server.listen(3000, () => {
  console.log('listening on *:3000');
});