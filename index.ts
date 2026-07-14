import express, { type NextFunction, type Request, type Response } from "express";
const app = express();
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose-cjs";
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
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)

const verifyToken = async (req:Request, res:Response, next:NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);

    (req as any).decoded = payload;

    next();
  } catch (error) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("bookverse")
    const bookCollection = db.collection("books")
    //getting books
   app.get("/books", async (req, res) => {
  try {
    const books = await bookCollection
      .find()
      .sort({ createdAt: -1 }) // newest first
      .toArray();

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
//deleting books
app.delete("/books/:id", verifyToken, async (req, res) => {
  try {
  const id = req.params.id;
const email = req.query.email;

const result = await bookCollection.deleteOne({
  _id: new ObjectId(id),
  ownerEmail: email,
});
    res.send(result);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      message: "Failed to delete book",
    });
  }
});//only user books
app.get("/my-books", verifyToken, async (req, res) => {
  try {
    const email = req.query.email;

    const books = await bookCollection
      .find({ ownerEmail: email })
      .toArray();

    res.send(books);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      message: "Failed to fetch books",
    });
  }
});
//featured book section
app.get("/featured-books", async (req, res) => {
  try {
   const books = await bookCollection
  .find({})
  .toArray();

books.sort(
  (a, b) => (b.rating ?? 4.5) - (a.rating ?? 4.5)
);

res.send(books.slice(0, 4));
  } catch (error) {
    console.log(error);

    res.status(500).send({
      message: "Failed to fetch featured books",
    });
  }
});
//statistic section
app.get("/genre-stats", async (req, res) => {
  try {
    const genres = await bookCollection
      .aggregate([
        {
          $group: {
            _id: "$genre",
            books: { $sum: 1 },
          },
        },
        {
          $sort: {
            books: -1,
          },
        },
      ])
      .toArray();

    res.send(genres);
  } catch (err) {
    console.log(err);

    res.status(500).send({
      message: "Failed to fetch genre stats",
    });
  }
});
//adding book
    app.post("/books", verifyToken, async(req, res)=>{
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
  ownerEmail: req.body.ownerEmail,
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
    //author section
app.get("/popular-authors", async (req, res) => {
  try {
    const authors = await bookCollection
      .aggregate([
        {
          $group: {
            _id: "$author",
            books: { $sum: 1 },
            genres: { $addToSet: "$genre" },
          },
        },
        {
          $project: {
            _id: 0,
            author: "$_id",
            books: 1,
            genres: 1,
          },
        },
        {
          $sort: {
            books: -1,
            author: 1,
          },
        },
        {
          $limit: 4,
        },
      ])
      .toArray();

    res.send(authors);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      message: "Failed to fetch authors",
    });
  }
});
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