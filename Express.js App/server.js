const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const propertiesReader = require("properties-reader");
const path = require("path");
const cors = require("cors");;
const app = express();

const morgan =  require("morgan");

app.use(morgan('dev'));

app.use(cors());
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  )
  next()
})

app.use("/Icons", express.static(path.join(__dirname, "Icons/")));

app.use("/Icons/*", function(req,res){
  res.status(404).send("Sorry, image not found");
})


const PORT = process.env.PORT || 9999;

// Load database configuration from properties file
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd"));
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");
const uri = `mongodb+srv://SandeshRayamajhi:sandesh08@bookstorecluster.burpfnz.mongodb.net/?retryWrites=true&w=majority`;

// Connect to MongoDB
const client = new MongoClient(uri);

async function start() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    // Specify the database and collection
    const database = client.db("Bookstore");
    const collection = database.collection("products");
    const orders = database.collection("orders");

    // Pass the collection to the middleware
    app.use((req, res, next) => {
      req.collection = collection;
      req.order = orders;
      next();
    });

    // Read operation - Get all products
    app.get('/collections/products', async (req, res, next) => {
      try {
        const products = await req.collection.find({}).toArray();
        res.send(products);
      } catch (err) {
        return next(err);
      }
    });

    app.post('/collections/products', express.json(), async (req, res, next) => {
      try {
        const newOrder = req.body;
        const result = await req.collection.insertOne(newOrder);
        // Send the inserted order as the response
        res.json(result); 
      } catch (err) {
        return next(err);
      }
    });

    app.post('/collections/orders', express.json(), async (req, res, next) => {
      try {
        const newOrder = req.body;
        const result = await req.order.insertOne(newOrder);
        // Send the inserted order as the response
        res.json(result); 
      } catch (err) {
        return next(err);
      }
    });

    // Update operation - Update a product
    app.put('/collections/products',express.json(), async (req, res, next) => {
      const ids = req.body.id; // Array of lessonIds
      const quantity = req.body.quantity; // Array of quantity
      try {
        const promises = ids.map(async (id, index) => {
            const lessonId = parseInt(id);
            const space = parseInt(quantity[index]);
            return req.collection.updateOne({id: lessonId}, {$inc: {availability: -space}});
        });
        await Promise.all(promises);
        res.json({message: 'Products updated successfully'});
      } catch (err) {
        return next(err);
      }
    });

    // Delete operation - Delete a product
    app.delete('/collections/products/:id', async (req, res, next) => {
      try {
        const productId = req.params.id;
        const result = await req.collection.deleteOne({ id: parseInt(productId)});
        res.send(result.deletedCount > 0 ? 'Product deleted' : 'No product found to delete');
      } catch (err) {
        return next(err);
      }
    });

    // Add this route in your Express.js server file
app.get('/search', async (req, res) => {
  try {
      const searchQuery = req.query.query;
      const regex = new RegExp(searchQuery, 'i');

      // Perform a case-insensitive search on both "title" and "location"
      const searchResults = await YourModel.find({
          $or: [
              { title: { $regex: regex } },
              { location: { $regex: regex } }
          ]
      });

      res.json(searchResults);
  } catch (error) {
      console.error('Error in search route:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});


    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
}

start();
