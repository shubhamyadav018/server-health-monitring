from pymongo import MongoClient

# Connect to MongoDB (adjust the connection string if needed)
client = MongoClient("mongodb://localhost:27017/")

# Use (or create) the 'server_management' database
db = client["server_management"]

# Use (or create) the 'servers' collection
servers_collection = db["servers"]

# Define the server document to insert
server_document = {
    "name": "Server A",
    "metrics": {"cpu_usage": 45, "memory_usage": 70},
    "logs": []
}

# Insert the document into the collection
result = servers_collection.insert_one(server_document)
print("Inserted server with ID:", result.inserted_id)
