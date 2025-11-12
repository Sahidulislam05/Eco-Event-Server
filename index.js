const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@sahidul-islam.zbcwnr8.mongodb.net/?appName=Sahidul-Islam`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("Social-development");
    const eventsCollection = db.collection("events");
    const joinedEventsCollection = db.collection("joined-events");

    // Upcoming Events

    app.get("/events", async (req, res) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await eventsCollection
        .find({ eventDate: { $gte: today.toISOString() } })
        .sort({ eventDate: "asc" })
        .toArray();
      res.send(result);
    });

    // Search

    app.get("/search", async (req, res) => {
      const searchText = req.query.search || "";
      const type = req.query.type || "all";
      const query = {};

      if (searchText) {
        query.title = { $regex: searchText, $options: "i" };
      }

      if (type !== "all") {
        query.eventType = { $regex: `^${type}$`, $options: "i" };
      }

      const result = await eventsCollection.find(query).toArray();
      res.send(result);
    });

    // Create Events

    app.post("/events", async (req, res) => {
      const event = req.body;
      const {
        title,
        description,
        eventType,
        thumbnail,
        location,
        eventDate,
        creatorEmail,
      } = event;

      if (
        !title ||
        !description ||
        !eventType ||
        !thumbnail ||
        !location ||
        !eventDate ||
        !creatorEmail
      ) {
        return res.status(400).send({ message: "All fields are required!" });
      }

      const today = new Date().toISOString().split("T")[0];
      if (eventDate <= today) {
        return res
          .status(400)
          .send({ message: "Event date must be in the future!" });
      }
      const result = await eventsCollection.insertOne(event);
      res.send(result);
    });

    // Events details
    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;
      const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
      res.send(event);
    });
    await client.db("admin").command({ ping: 1 });

    // My events

    app.get("/my-events", async (req, res) => {
      const email = req.query.email;
      const cursor = eventsCollection.find({ creatorEmail: email });
      const result = await cursor.toArray();
      res.send(result);
    });

    // Update event

    app.put("/events/:id", async (req, res) => {
      const { id } = req.params;
      const userEmail = req.body.email;
      const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
      if (event.creatorEmail !== userEmail) {
        return res.status(403).send({ message: "Access denied" });
      }
      const updatedEvent = req.body;
      const result = await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedEvent }
      );
      res.send(result);
    });

    // Joined events

    app.get("/joined-events", async (req, res) => {
      const { email, eventId } = req.query;
      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }
      let query = { userEmail: email };

      if (eventId) {
        query.eventId = eventId;
      }
      const result = await joinedEventsCollection
        .find(query)
        .sort({ eventDate: 1 })
        .toArray();

      if (eventId) {
        return res.send({ alreadyJoined: result.length > 0 });
      }

      res.send(result);
    });

    // Store event

    app.post("/joined-events", async (req, res) => {
      const joinedEvent = req.body;

      const { eventId, userEmail } = joinedEvent;

      if (!eventId || !userEmail) {
        return res.status(400).send({ message: "Invalid data!" });
      }
      const existing = await joinedEventsCollection.findOne({
        eventId,
        userEmail,
      });

      if (existing) {
        return res.status(400).send({ message: "Already joined!" });
      }

      const result = await joinedEventsCollection.insertOne(joinedEvent);
      res.status(200).send({ message: "Joined successfully!", result });
    });

    // Delete events

    app.delete("/events/:id", async (req, res) => {
      const id = req.params.id;
      const result = await eventsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });
    // Checking API Server
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Social development events platform server is running!");
});

app.listen(port, () => {
  console.log(
    `Social Development Events app Server listening on port: ${port}`
  );
});
