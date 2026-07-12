import express from "express";
const app = express();
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Server Running");
});



const uri = process.env.MONGO_DB_URI
if (!uri) {
  throw new Error("MONGO_DB_URI is missing in .env");
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("bookverse")
    const bookCollection = db.collection("books")
    //getting books
    app.get("/books", async (req, res) => {
  try {
    const books = await bookCollection.find().toArray();
    res.send(books);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Failed to fetch books",
    });
  }
});
//details of books
app.get("/books/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const query = { _id: new ObjectId(id) };

    const book = await bookCollection.findOne(query);

    res.send(book);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Failed to fetch book",
    });
  }
});
//adding book
    app.post("/books", async(req, res)=>{
        try{
           const book = {
  title: req.body.title,
  author: req.body.author,
  genre: req.body.genre,
  shortDescription: req.body.shortDescription,
  description: req.body.description,
  image: req.body.image,
  price: Number(req.body.price),
  rating: Number(req.body.rating) || 0,
  createdAt: new Date(),
};
            const result = await bookCollection.insertOne(book);
            res.send(result)
        }catch(error){
             console.log(error);
             res.status(500).send({
                message: "Failed to add book"
             })
        }
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});